"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function updateNewsletterConsent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const consent = formData.get("newsletterConsent") === "on"

  const { error } = await supabase
    .from("profiles")
    .update({ newsletter_consent: consent })
    .eq("id", user.id)

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/dashboard")
  redirect("/dashboard?message=Préférences mises à jour.")
}
