import { redirect } from "next/navigation"
import { SiteHeader, type NavItem } from "@/components/site-header"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single()

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Mon profil" },
    { href: "/dashboard/engagements", label: "Mes engagements" },
    { href: "/dashboard/signups", label: "Mes inscriptions" },
    { href: "/dashboard/points", label: "Mes points" },
  ]

  if (profile?.platform_role === "super_admin") {
    navItems.push({ href: "/admin/manifestations", label: "Admin" })
  } else {
    const { count } = await supabase
      .from("manifestation_admins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
    if (count && count > 0) {
      navItems.push({ href: "/manage", label: "Gérer" })
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader navItems={navItems} userEmail={user.email} />
      <div className="mx-auto max-w-5xl p-4 sm:p-8">{children}</div>
    </div>
  )
}
