import { corsHeaders } from "../_shared/cors.ts"
import { AuthError, createServiceRoleClient, getCaller, isManifestationAdmin } from "../_shared/auth.ts"

const WINDOW_MINUTES = 5

// Two ways to call this function:
// 1. pg_cron, every 5 minutes, authenticated with the service-role key --
//    sweeps every manifestation with sms_enabled and send_mode='automatic'.
// 2. A manifestation admin, from the "Envoyer maintenant" button on
//    /manage/:id/reminders -- forces a send for one manifestation right now,
//    regardless of its send_mode (that's the point of the manual trigger).
//    No separate "dry run / preview" mode: nothing in the UI consumes a
//    preview list, so it isn't built (YAGNI).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const authHeader = req.headers.get("Authorization") ?? ""
    const isCron = authHeader === `Bearer ${serviceRoleKey}`

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
    const admin = createServiceRoleClient()

    let manifestationIds: string[]
    let forceManual = false

    if (isCron) {
      const { data: settings } = await admin
        .from("manifestation_reminder_settings")
        .select("manifestation_id")
        .eq("sms_enabled", true)
        .eq("send_mode", "automatic")
      manifestationIds = settings?.map((s) => s.manifestation_id) ?? []
    } else {
      const { user, callerClient } = await getCaller(req)
      const { manifestationId } = body
      if (!manifestationId) {
        throw new AuthError(400, "manifestationId requis.")
      }
      if (!(await isManifestationAdmin(callerClient, manifestationId, user.id))) {
        throw new AuthError(403, "Accès refusé à cette manifestation.")
      }
      manifestationIds = [manifestationId]
      forceManual = true
    }

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER")
    const twilioConfigured = Boolean(twilioSid && twilioToken && twilioFrom)

    let sent = 0
    let skippedNoPhone = 0
    let skippedNotConfigured = 0

    for (const manifestationId of manifestationIds) {
      if (forceManual) {
        const { data: settings } = await admin
          .from("manifestation_reminder_settings")
          .select("sms_enabled")
          .eq("manifestation_id", manifestationId)
          .maybeSingle()
        if (!settings?.sms_enabled) {
          continue
        }
      }

      const { data: rules } = await admin
        .from("reminder_rules")
        .select("id, offset_minutes, message_template")
        .eq("manifestation_id", manifestationId)

      for (const rule of rules ?? []) {
        const windowStart = new Date(Date.now() + rule.offset_minutes * 60_000)
        const windowEnd = new Date(windowStart.getTime() + WINDOW_MINUTES * 60_000)

        const { data: signups } = await admin
          .from("shift_signups")
          .select("id, volunteer_id, shifts!inner(start_at, manifestation_id)")
          .eq("status", "confirmed")
          .eq("shifts.manifestation_id", manifestationId)
          .gte("shifts.start_at", windowStart.toISOString())
          .lt("shifts.start_at", windowEnd.toISOString())

        for (const signup of signups ?? []) {
          const { data: already } = await admin
            .from("reminder_sends")
            .select("id")
            .eq("shift_signup_id", signup.id)
            .eq("reminder_rule_id", rule.id)
            .maybeSingle()
          if (already) continue

          const { data: volunteer } = await admin
            .from("profiles")
            .select("phone")
            .eq("id", signup.volunteer_id)
            .single()

          if (!volunteer?.phone) {
            skippedNoPhone++
            continue
          }

          if (!twilioConfigured) {
            skippedNotConfigured++
            continue
          }

          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: volunteer.phone,
                From: twilioFrom!,
                Body: rule.message_template,
              }),
            },
          )

          if (!res.ok) {
            const errBody = await res.text()
            throw new AuthError(502, `Échec d'envoi Twilio : ${errBody}`)
          }

          await admin.from("reminder_sends").insert({
            manifestation_id: manifestationId,
            shift_signup_id: signup.id,
            reminder_rule_id: rule.id,
          })
          sent++
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, skippedNoPhone, skippedNotConfigured }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur inconnue."
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
