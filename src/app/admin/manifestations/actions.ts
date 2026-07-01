"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireSuperAdmin } from "@/lib/auth/guards"
import type { Database } from "@/lib/supabase/database.types"

// Branding edits + admin invitation/removal live in
// src/app/manage/[id]/actions.ts (accessible to manifestation_admins too,
// not just super_admin). This file keeps only what's genuinely
// super-admin-exclusive: creating a manifestation in the first place.

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
  redirect(`/manage/${data.id}`)
}
