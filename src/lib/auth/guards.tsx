import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useParams } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"

// Client-side guards are UX only (avoid a flash of unauthorized content and
// give a redirect) -- RLS is the actual security boundary (doc/data-model.md),
// not these components.

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

export function RequireRole({ role, children }: { role: "super_admin"; children: ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (profile?.platform_role !== role) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

// Manifestation-scoped access: super_admin (all manifestations) or a
// manifestation_admins row for this specific manifestation. Mirrors the
// former requireManifestationAccess() server guard.
export function RequireManifestationAccess({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (authLoading || !user || !id) return

    if (profile?.platform_role === "super_admin") {
      setAllowed(true)
      setChecking(false)
      return
    }

    const supabase = createClient()
    supabase
      .from("manifestation_admins")
      .select("role")
      .eq("manifestation_id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(Boolean(data))
        setChecking(false)
      })
  }, [authLoading, user, profile, id])

  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (checking) return null
  if (!allowed) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
