import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function requireSuperAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profile?.platform_role !== "super_admin") {
    redirect("/dashboard")
  }

  return { supabase, user, profile }
}

// Manifestation-scoped access: super_admin (all manifestations) or a
// manifestation_admins row for this specific manifestation. Used by
// /manage/[id]/* -- the manifestation-admin-facing area, distinct from
// /admin/* which is super_admin-only.
export async function requireManifestationAccess(manifestationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profile?.platform_role !== "super_admin") {
    const { data: adminRow } = await supabase
      .from("manifestation_admins")
      .select("role")
      .eq("manifestation_id", manifestationId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!adminRow) {
      redirect("/dashboard")
    }
  }

  return { supabase, user, profile }
}
