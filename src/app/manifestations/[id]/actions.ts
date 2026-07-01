"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signUpForShift(manifestationId: string, shiftId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/manifestations/${manifestationId}`)}`)
  }

  // create_shift_signup() (SECURITY DEFINER) checks capacity and picks the
  // right initial status (confirmed/applied) per the manifestation's
  // shift_signup_mode -- see supabase/migrations for why this can't be
  // plain RLS/CHECK constraints (atomicity against concurrent signups).
  const { error } = await supabase.rpc("create_shift_signup", { _shift_id: shiftId })

  if (error) {
    redirect(
      `/manifestations/${manifestationId}?error=${encodeURIComponent(error.message)}`,
    )
  }

  revalidatePath(`/manifestations/${manifestationId}`)
  redirect(`/manifestations/${manifestationId}?message=Inscription enregistrée.`)
}
