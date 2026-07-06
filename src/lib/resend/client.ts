import { Resend } from "resend"

// Server-only. RESEND_API_KEY is provided later (same pattern as
// SUPABASE_SECRET_KEY at Phase 1) -- callers must handle the case where
// it's not configured yet rather than let this throw at import time.
export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

// Requires a domain verified in Resend -- until then this placeholder
// only works in Resend's own sandbox mode. Set RESEND_FROM_EMAIL once a
// real sending domain is verified.
export const NEWSLETTER_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Bénévoles Lavaux <onboarding@resend.dev>"
