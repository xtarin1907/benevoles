"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireManifestationAccess } from "@/lib/auth/guards"
import type { Database } from "@/lib/supabase/database.types"

type ShiftSignupStatus = Database["public"]["Enums"]["shift_signup_status"]

export async function updateSignupStatus(
  manifestationId: string,
  shiftId: string,
  signupId: string,
  status: ShiftSignupStatus,
) {
  const { supabase } = await requireManifestationAccess(manifestationId)

  const { error } = await supabase
    .from("shift_signups")
    .update({ status })
    .eq("id", signupId)

  if (error) {
    redirect(
      `/manage/${manifestationId}/shifts/${shiftId}?error=${encodeURIComponent(error.message)}`,
    )
  }

  revalidatePath(`/manage/${manifestationId}/shifts/${shiftId}`)
  redirect(`/manage/${manifestationId}/shifts/${shiftId}`)
}
