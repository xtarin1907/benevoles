import { corsHeaders } from "../_shared/cors.ts"
import { AuthError, createServiceRoleClient, getCaller, isManifestationAdmin } from "../_shared/auth.ts"

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Mirrors the former src/app/manage/[id]/newsletter/actions.ts sendNewsletter.
// Deliberately NOT using Resend's Audiences/Broadcasts feature -- our own DB
// is already the source of truth for consent/engagement, so a direct batch
// send computed fresh at send-time avoids a second system to keep in sync.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { user, profile, callerClient } = await getCaller(req)
    const { manifestationId, subject, body, scope } = await req.json()

    if (!manifestationId || !subject || !body || !scope) {
      throw new AuthError(400, "manifestationId, subject, body et scope requis.")
    }

    const authorized =
      profile?.platform_role === "super_admin" ||
      (await isManifestationAdmin(callerClient, manifestationId, user.id))

    if (!authorized) {
      throw new AuthError(403, "Accès refusé à cette manifestation.")
    }

    const admin = createServiceRoleClient()
    let recipients: { email: string }[] = []

    if (scope === "all_platform") {
      // Locked decision (roadmap.md Décision #2): any manifestation_admin
      // may target the whole platform, not just super_admin.
      const { data } = await admin
        .from("profiles")
        .select("email")
        .eq("platform_role", "user")
        .eq("newsletter_consent", true)
      recipients = data ?? []
    } else {
      const { data } = await admin
        .from("manifestation_engagements")
        .select("profiles(email, newsletter_consent)")
        .eq("manifestation_id", manifestationId)
        .neq("status", "withdrawn")
      recipients = (data ?? [])
        .filter((row: { profiles: { newsletter_consent: boolean } | null }) => row.profiles?.newsletter_consent)
        .map((row: { profiles: { email: string } | null }) => ({ email: row.profiles!.email }))
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun destinataire n'a donné son consentement newsletter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      throw new AuthError(500, "Newsletter non configurée : RESEND_API_KEY manquant.")
    }
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Bénévoles+ <onboarding@resend.dev>"
    const html = `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`

    // Resend's batch endpoint caps at 100 emails per call (per-recipient
    // `to` arrays, never a shared one -- recipients must not see each
    // other's addresses).
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100)
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk.map((r) => ({ from, to: [r.email], subject, html }))),
      })
      if (!res.ok) {
        const errBody = await res.text()
        throw new AuthError(502, `Échec d'envoi Resend : ${errBody}`)
      }
    }

    const { error: logError } = await admin.from("newsletter_sends").insert({
      manifestation_id: scope === "all_platform" ? null : manifestationId,
      sent_by: user.id,
      subject,
      audience_scope: scope,
      recipient_count: recipients.length,
    })

    if (logError) {
      throw new AuthError(500, logError.message)
    }

    return new Response(JSON.stringify({ success: true, recipientCount: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Erreur inconnue."
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
