"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireManifestationAccess } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/database.types"

type ShiftSignupMode = Database["public"]["Enums"]["shift_signup_mode"]

export async function updateManifestationBranding(id: string, formData: FormData) {
  const { supabase } = await requireManifestationAccess(id)

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const colorHex = formData.get("colorHex") as string
  const logoUrl = formData.get("logoUrl") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const shiftSignupMode = formData.get("shiftSignupMode") as ShiftSignupMode
  const isPublished = formData.get("isPublished") === "on"

  const { error } = await supabase
    .from("manifestations")
    .update({
      name,
      description: description || null,
      color_hex: colorHex || "#6366f1",
      logo_url: logoUrl || null,
      start_date: startDate || null,
      end_date: endDate || null,
      shift_signup_mode: shiftSignupMode,
      is_published: isPublished,
    })
    .eq("id", id)

  if (error) {
    redirect(`/manage/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/manage/${id}`)
  redirect(`/manage/${id}?message=Manifestation mise à jour.`)
}

// Invitation/retrait d'admins reste réservé au super_admin (RLS : seul un
// 'owner' ou super_admin peut écrire manifestation_admins -- aucun flux
// ne crée d'owner pour l'instant, donc en pratique seul super_admin peut
// agir ici). requireManifestationAccess() autorise l'accès à la page pour
// un manifestation_admin, mais ces deux actions se re-vérifient elles-mêmes.
export async function inviteManifestationAdmin(manifestationId: string, formData: FormData) {
  const { profile } = await requireManifestationAccess(manifestationId)
  if (profile?.platform_role !== "super_admin") {
    redirect(`/manage/${manifestationId}?error=${encodeURIComponent("Réservé au super admin.")}`)
  }

  const email = formData.get("email") as string

  const admin = createAdminClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)

  if (inviteError) {
    redirect(
      `/manage/${manifestationId}?error=${encodeURIComponent(inviteError.message)}`,
    )
  }

  const { supabase } = await requireManifestationAccess(manifestationId)
  const { error: linkError } = await supabase.from("manifestation_admins").insert({
    manifestation_id: manifestationId,
    user_id: invited.user.id,
    role: "admin",
  })

  if (linkError) {
    redirect(
      `/manage/${manifestationId}?error=${encodeURIComponent(linkError.message)}`,
    )
  }

  revalidatePath(`/manage/${manifestationId}`)
  redirect(`/manage/${manifestationId}?message=Invitation envoyée à ${email}.`)
}

export async function removeManifestationAdmin(manifestationId: string, userId: string) {
  const { supabase, profile } = await requireManifestationAccess(manifestationId)
  if (profile?.platform_role !== "super_admin") {
    redirect(`/manage/${manifestationId}?error=${encodeURIComponent("Réservé au super admin.")}`)
  }

  const { error } = await supabase
    .from("manifestation_admins")
    .delete()
    .eq("manifestation_id", manifestationId)
    .eq("user_id", userId)

  if (error) {
    redirect(`/manage/${manifestationId}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/manage/${manifestationId}`)
  redirect(`/manage/${manifestationId}`)
}
