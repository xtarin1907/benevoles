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
