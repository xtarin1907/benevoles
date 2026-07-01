import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Lighter than /admin/layout.tsx's requireSuperAdmin(): manifestation
// admins (not just super_admin) belong here. Each page under /manage
// enforces the real per-manifestation check via requireManifestationAccess().
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 border-b p-4 text-sm">
        <Link href="/manage" className="font-medium">
          Mes manifestations
        </Link>
        <Link href="/dashboard" className="font-medium">
          Mon profil
        </Link>
      </nav>
      <div className="p-8">{children}</div>
    </div>
  )
}
