"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Only allow same-site relative paths -- `next` round-trips through a
// query param an attacker could craft (e.g. /login?next=https://evil.com),
// so a bare `redirect(next)` would be an open redirect.
function safeNext(next: FormDataEntryValue | null): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next
  }
  return "/dashboard"
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const next = safeNext(formData.get("next"))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect(next)
}
