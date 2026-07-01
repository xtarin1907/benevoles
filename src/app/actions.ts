"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function engageWithManifestation(manifestationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/signup?next=/")
  }

  // Upsert: a volunteer can only engage once per manifestation
  // (manifestation_engagements has a UNIQUE(manifestation_id, volunteer_id)
  // constraint) -- re-clicking "S'engager" after already engaging is a
  // no-op, not an error.
  const { error } = await supabase
    .from("manifestation_engagements")
    .upsert(
      { manifestation_id: manifestationId, volunteer_id: user.id, status: "interested" },
      { onConflict: "manifestation_id,volunteer_id", ignoreDuplicates: true },
    )

  if (error) {
    redirect(`/?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/")
  redirect("/?message=Tu es engagé sur cette manifestation !")
}
