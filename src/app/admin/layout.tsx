import Link from "next/link"
import { requireSuperAdmin } from "@/lib/auth/guards"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin()

  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 border-b p-4 text-sm">
        <Link href="/admin/manifestations" className="font-medium">
          Manifestations
        </Link>
        <Link href="/admin/volunteers" className="font-medium">
          Bénévoles
        </Link>
      </nav>
      <div className="p-8">{children}</div>
    </div>
  )
}
