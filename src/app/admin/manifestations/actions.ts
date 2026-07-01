"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireSuperAdmin } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/supabase/database.types"

type ShiftSignupMode = Database["public"]["Enums"]["shift_signup_mode"]

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function createManifestation(formData: FormData) {
  const { supabase, user } = await requireSuperAdmin()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const colorHex = formData.get("colorHex") as string
  const shiftSignupMode = formData.get("shiftSignupMode") as ShiftSignupMode

  const { data, error } = await supabase
    .from("manifestations")
    .insert({
      name,
      slug: slugify(name),
      description: description || null,
      color_hex: colorHex || "#6366f1",
      shift_signup_mode: shiftSignupMode,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) {
    redirect(`/admin/manifestations/new?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/admin/manifestations")
  redirect(`/admin/manifestations/${data.id}`)
}

export async function updateManifestation(id: string, formData: FormData) {
  const { supabase } = await requireSuperAdmin()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const colorHex = formData.get("colorHex") as string
  const shiftSignupMode = formData.get("shiftSignupMode") as ShiftSignupMode
  const isPublished = formData.get("isPublished") === "on"

  const { error } = await supabase
    .from("manifestations")
    .update({
      name,
      description: description || null,
      color_hex: colorHex || "#6366f1",
      shift_signup_mode: shiftSignupMode,
      is_published: isPublished,
    })
    .eq("id", id)

  if (error) {
    redirect(`/admin/manifestations/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(`/admin/manifestations/${id}`)
  revalidatePath("/admin/manifestations")
  redirect(`/admin/manifestations/${id}?message=Manifestation mise à jour.`)
}

export async function inviteManifestationAdmin(manifestationId: string, formData: FormData) {
  await requireSuperAdmin()

  const email = formData.get("email") as string

  // Locked decision (doc/roadmap.md): admins are invited by email via the
  // Supabase Auth Admin API, which creates the account directly. This has
  // no RLS-scoped equivalent -- it's the one place this app uses the
  // service-role admin client. Known v1 limitation: if `email` already
  // has an account, inviteUserByEmail errors rather than linking the
  // existing account -- not handled here, revisit only if it comes up.
  const admin = createAdminClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)

  if (inviteError) {
    redirect(
      `/admin/manifestations/${manifestationId}?error=${encodeURIComponent(inviteError.message)}`,
    )
  }

  // Insert through the RLS-scoped client (not the admin client) so RLS
  // stays the real gatekeeper here -- requireSuperAdmin() above is a UX
  // guard, this INSERT is the actual enforcement.
  const { supabase } = await requireSuperAdmin()
  const { error: linkError } = await supabase.from("manifestation_admins").insert({
    manifestation_id: manifestationId,
    user_id: invited.user.id,
    role: "admin",
  })

  if (linkError) {
    redirect(
      `/admin/manifestations/${manifestationId}?error=${encodeURIComponent(linkError.message)}`,
    )
  }

  revalidatePath(`/admin/manifestations/${manifestationId}`)
  redirect(`/admin/manifestations/${manifestationId}?message=Invitation envoyée à ${email}.`)
}

export async function removeManifestationAdmin(manifestationId: string, userId: string) {
  const { supabase } = await requireSuperAdmin()

  const { error } = await supabase
    .from("manifestation_admins")
    .delete()
    .eq("manifestation_id", manifestationId)
    .eq("user_id", userId)

  if (error) {
    redirect(
      `/admin/manifestations/${manifestationId}?error=${encodeURIComponent(error.message)}`,
    )
  }

  revalidatePath(`/admin/manifestations/${manifestationId}`)
  redirect(`/admin/manifestations/${manifestationId}`)
}
