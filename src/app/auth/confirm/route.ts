import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Handles the newer query-param confirmation flow
// (?token_hash=...&type=...&next=...), used if the Supabase email
// templates are ever customized to link here directly instead of
// through GoTrue's hash-fragment /verify redirect (see
// src/app/auth/callback/page.tsx for that flow). Not currently wired up
// via any Supabase email template, but this is the officially documented
// pattern -- kept ready for when templates get customized.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/update-password"

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
  }

  return NextResponse.redirect(new URL("/login?error=Lien invalide ou expiré.", request.url))
}
