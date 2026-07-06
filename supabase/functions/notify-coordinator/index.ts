import { corsHeaders } from "../_shared/cors.ts"
import { AuthError, createServiceRoleClient, getCaller } from "../_shared/auth.ts"
import { brandEmail } from "../_shared/email.ts"

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

const ACTION_LABELS: Record<string, string> = {
  created: "s'est inscrit(e) à",
  cancelled: "a annulé son inscription à",
}

// Fired by the client right after a volunteer creates or cancels a shift
// signup (src/pages/ManifestationDetail.tsx, src/pages/dashboard/Signups.tsx).
// No-op (still 200) when the manifestation has no coordinator_email set --
// this is an opt-in convenience for organizers, not a required field.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { callerClient } = await getCaller(req)
    const { shiftSignupId, action } = await req.json()

    if (!shiftSignupId || !ACTION_LABELS[action]) {
      throw new AuthError(400, "shiftSignupId et action ('created'|'cancelled') requis.")
    }

    // RLS-scoped check: only succeeds if the caller owns this signup or
    // administers the manifestation it belongs to -- same authorization
    // boundary as the rest of the app, no hand-rolled check needed here.
    // Deliberately NOT joining to shifts/manifestations on this client: a
    // manifestation unpublished after volunteers already signed up would
    // make the embedded read return null via RLS even for the legitimate
    // owner, since the public-read shifts policy requires is_published.
    const { data: authCheck, error: authError } = await callerClient
      .from("shift_signups")
      .select("id, volunteer_id, shift_id")
      .eq("id", shiftSignupId)
      .single()

    if (authError || !authCheck) {
      throw new AuthError(404, "Inscription introuvable.")
    }

    const admin = createServiceRoleClient()
    const { data: signup, error: signupError } = await admin
      .from("shift_signups")
      .select(
        "volunteer_id, shifts(name, start_at, manifestation_id, manifestations(name, coordinator_name, coordinator_email))",
      )
      .eq("id", shiftSignupId)
      .single()

    if (signupError || !signup?.shifts) {
      throw new AuthError(404, "Inscription introuvable.")
    }

    const manifestation = signup.shifts.manifestations
    if (!manifestation?.coordinator_email) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: volunteer } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", signup.volunteer_id)
      .single()

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      throw new AuthError(500, "Notification non configurée : RESEND_API_KEY manquant.")
    }
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Bénévoles Lavaux <onboarding@resend.dev>"

    const volunteerLabel = volunteer?.full_name ?? volunteer?.email ?? "Un(e) bénévole"
    const shiftDate = new Date(signup.shifts.start_at).toLocaleString("fr-CH")
    const html = brandEmail(`<p>${escapeHtml(volunteerLabel)} ${ACTION_LABELS[action]} :</p>
<p><strong>${escapeHtml(manifestation.name)}</strong> — ${escapeHtml(signup.shifts.name)}<br>${escapeHtml(shiftDate)}</p>`)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [manifestation.coordinator_email],
        subject: `${manifestation.name} — mise à jour d'inscription`,
        html,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new AuthError(502, `Échec d'envoi Resend : ${errBody}`)
    }

    return new Response(JSON.stringify({ success: true }), {
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
