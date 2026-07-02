import { Outlet } from "react-router-dom"
import { SiteHeader, type NavItem } from "@/components/site-header"
import { ProtectedRoute } from "@/lib/auth/guards"
import { useAuth } from "@/contexts/AuthContext"

export default function DashboardLayout() {
  const { user, profile, isManifestationAdmin } = useAuth()

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Mon profil" },
    { href: "/dashboard/engagements", label: "Mes engagements" },
    { href: "/dashboard/signups", label: "Mes inscriptions" },
    { href: "/dashboard/points", label: "Mes points" },
  ]

  if (profile?.platform_role === "super_admin") {
    navItems.push({ href: "/admin/manifestations", label: "Admin" })
  } else if (isManifestationAdmin) {
    navItems.push({ href: "/manage", label: "Gérer" })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <SiteHeader navItems={navItems} userEmail={user?.email} />
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
          <Outlet />
        </div>
      </div>
    </ProtectedRoute>
  )
}
