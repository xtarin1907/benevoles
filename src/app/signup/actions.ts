"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next
  }
  return null
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string
  const newsletterConsent = formData.get("newsletterConsent") === "on"
  const next = safeNext(formData.get("next"))

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // Read by handle_new_user() to seed profiles.newsletter_consent --
    // explicit opt-in, unchecked by default (CLAUDE.md non-négociable).
    options: { data: { full_name: fullName, newsletter_consent: newsletterConsent } },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  const nextParam = next ? `&next=${encodeURIComponent(next)}` : ""
  redirect(`/login?message=${encodeURIComponent("Compte créé, vérifie ton email pour confirmer.")}${nextParam}`)
}
