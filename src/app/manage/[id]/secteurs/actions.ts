"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireManifestationAccess } from "@/lib/auth/guards"

export async function createSecteur(manifestationId: string, formData: FormData) {
  const { supabase } = await requireManifestationAccess(manifestationId)

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const colorHex = formData.get("colorHex") as string

  const { error } = await supabase.from("secteurs").insert({
    manifestation_id: manifestationId,
    name,
    description: description || null,
    color_hex: colorHex || null,
  })

  if (error) {
    redirect(`/manage/${manifestationId}/secteurs?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/manage/${manifestationId}/secteurs`)
  redirect(`/manage/${manifestationId}/secteurs`)
}

export async function deleteSecteur(manifestationId: string, secteurId: string) {
  const { supabase } = await requireManifestationAccess(manifestationId)

  const { error } = await supabase.from("secteurs").delete().eq("id", secteurId)

  if (error) {
    redirect(`/manage/${manifestationId}/secteurs?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/manage/${manifestationId}/secteurs`)
  redirect(`/manage/${manifestationId}/secteurs`)
}
