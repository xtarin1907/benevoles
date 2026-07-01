"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireManifestationAccess } from "@/lib/auth/guards"

export async function createShift(manifestationId: string, formData: FormData) {
  const { supabase } = await requireManifestationAccess(manifestationId)

  const secteurId = formData.get("secteurId") as string
  const name = formData.get("name") as string
  const startAt = formData.get("startAt") as string
  const endAt = formData.get("endAt") as string
  const capacity = Number(formData.get("capacity"))
  const description = formData.get("description") as string

  const { error } = await supabase.from("shifts").insert({
    manifestation_id: manifestationId,
    secteur_id: secteurId,
    name,
    start_at: new Date(startAt).toISOString(),
    end_at: new Date(endAt).toISOString(),
    capacity,
    description: description || null,
  })

  if (error) {
    redirect(`/manage/${manifestationId}/shifts?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/manage/${manifestationId}/shifts`)
  redirect(`/manage/${manifestationId}/shifts`)
}

export async function deleteShift(manifestationId: string, shiftId: string) {
  const { supabase } = await requireManifestationAccess(manifestationId)

  const { error } = await supabase.from("shifts").delete().eq("id", shiftId)

  if (error) {
    redirect(`/manage/${manifestationId}/shifts?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/manage/${manifestationId}/shifts`)
  redirect(`/manage/${manifestationId}/shifts`)
}
