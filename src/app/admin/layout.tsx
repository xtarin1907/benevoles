import { SiteHeader, type NavItem } from "@/components/site-header"
import { requireSuperAdmin } from "@/lib/auth/guards"

const navItems: NavItem[] = [
  { href: "/admin/manifestations", label: "Manifestations" },
  { href: "/admin/volunteers", label: "Bénévoles" },
  { href: "/manage", label: "Gérer" },
  { href: "/dashboard", label: "Mon profil" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSuperAdmin()

  return (
    <div className="min-h-screen">
      <SiteHeader navItems={navItems} userEmail={user.email} />
      <div className="mx-auto max-w-5xl p-4 sm:p-8">{children}</div>
    </div>
  )
}
