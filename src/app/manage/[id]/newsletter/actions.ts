"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireManifestationAccess } from "@/lib/auth/guards"
import { createResendClient, NEWSLETTER_FROM } from "@/lib/resend/client"
import type { Database } from "@/lib/supabase/database.types"

type AudienceScope = Database["public"]["Enums"]["newsletter_audience_scope"]

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Deliberately NOT using Resend's Audiences/Broadcasts feature (the
// original architecture.md plan) -- that requires syncing a separate
// contact list in Resend, kept up to date with every consent/engagement
// change. Our own DB is already the source of truth for both, so a
// direct batch send computed fresh at send-time avoids a second system
// to keep in sync, for the same functional outcome at this scale.
export async function sendNewsletter(manifestationId: string, formData: FormData) {
  const { supabase, user } = await requireManifestationAccess(manifestationId)

  const subject = formData.get("subject") as string
  const body = formData.get("body") as string
  const scope = formData.get("scope") as AudienceScope

  let recipients: { email: string }[] = []

  if (scope === "all_platform") {
    // Locked decision (roadmap.md Décision #2): any manifestation_admin
    // may target the whole platform, not just super_admin.
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("platform_role", "user")
      .eq("newsletter_consent", true)
    recipients = data ?? []
  } else {
    const { data } = await supabase
      .from("manifestation_engagements")
      .select("profiles(email, newsletter_consent)")
      .eq("manifestation_id", manifestationId)
      .neq("status", "withdrawn")
    recipients = (data ?? [])
      .filter((row) => row.profiles?.newsletter_consent)
      .map((row) => ({ email: row.profiles!.email }))
  }

  if (recipients.length === 0) {
    redirect(
      `/manage/${manifestationId}/newsletter?message=${encodeURIComponent("Aucun destinataire n'a donné son consentement newsletter.")}`,
    )
  }

  const resend = createResendClient()
  if (!resend) {
    redirect(
      `/manage/${manifestationId}/newsletter?error=${encodeURIComponent("Newsletter non configurée : RESEND_API_KEY manquant.")}`,
    )
  }

  const html = `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`

  // Resend's batch endpoint caps at 100 emails per call (per-recipient
  // `to` arrays, never a shared one -- recipients must not see each
  // other's addresses).
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const { error: sendError } = await resend.batch.send(
      chunk.map((r) => ({
        from: NEWSLETTER_FROM,
        to: [r.email],
        subject,
        html,
      })),
    )
    if (sendError) {
      redirect(
        `/manage/${manifestationId}/newsletter?error=${encodeURIComponent(sendError.message)}`,
      )
    }
  }

  const { error: logError } = await supabase.from("newsletter_sends").insert({
    manifestation_id: scope === "all_platform" ? null : manifestationId,
    sent_by: user.id,
    subject,
    audience_scope: scope,
    recipient_count: recipients.length,
  })

  if (logError) {
    redirect(
      `/manage/${manifestationId}/newsletter?error=${encodeURIComponent(logError.message)}`,
    )
  }

  revalidatePath(`/manage/${manifestationId}/newsletter`)
  redirect(
    `/manage/${manifestationId}/newsletter?message=${encodeURIComponent(`Envoyé à ${recipients.length} bénévole(s).`)}`,
  )
}
