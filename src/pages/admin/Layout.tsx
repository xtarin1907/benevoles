import { Outlet } from "react-router-dom"
import { SiteHeader, type NavItem } from "@/components/site-header"
import { RequireRole } from "@/lib/auth/guards"
import { useAuth } from "@/contexts/AuthContext"

const navItems: NavItem[] = [
  { href: "/admin/manifestations", label: "Manifestations" },
  { href: "/admin/volunteers", label: "Bénévoles" },
  { href: "/manage", label: "Gérer" },
  { href: "/dashboard", label: "Mon profil" },
]

export default function AdminLayout() {
  const { user } = useAuth()

  return (
    <RequireRole role="super_admin">
      <div className="min-h-screen">
        <SiteHeader navItems={navItems} userEmail={user?.email} />
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
          <Outlet />
        </div>
      </div>
    </RequireRole>
  )
}
