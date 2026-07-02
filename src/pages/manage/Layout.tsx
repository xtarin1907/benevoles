import { Outlet } from "react-router-dom"
import { SiteHeader, type NavItem } from "@/components/site-header"
import { ProtectedRoute } from "@/lib/auth/guards"
import { useAuth } from "@/contexts/AuthContext"

// Lighter than admin/Layout.tsx's RequireRole("super_admin"): manifestation
// admins (not just super_admin) belong here. Each page under /manage
// enforces the real per-manifestation check via RequireManifestationAccess.
export default function ManageLayout() {
  const { user, profile } = useAuth()

  const navItems: NavItem[] = [
    { href: "/manage", label: "Mes manifestations" },
    { href: "/dashboard", label: "Mon profil" },
  ]

  if (profile?.platform_role === "super_admin") {
    navItems.push({ href: "/admin/manifestations", label: "Admin" })
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
