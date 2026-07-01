"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"

type EngagementStatus = Database["public"]["Enums"]["engagement_status"]

export async function setEngagementStatus(manifestationId: string, status: EngagementStatus) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { error } = await supabase
    .from("manifestation_engagements")
    .update({ status })
    .eq("manifestation_id", manifestationId)
    .eq("volunteer_id", user.id)

  if (error) {
    redirect(`/dashboard/engagements?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/dashboard/engagements")
  redirect("/dashboard/engagements")
}
