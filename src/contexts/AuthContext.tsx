import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

type AuthContextValue = {
  user: User | null
  profile: Profile | null
  isManifestationAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Replaces src/proxy.ts (Next.js middleware): there is no server request to
// intercept anymore, supabase-js refreshes the session token on its own as
// long as this client instance stays alive for the page's lifetime.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isManifestationAdmin, setIsManifestationAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile(currentUser: User) {
      const [{ data: profileRow }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUser.id).single(),
        supabase
          .from("manifestation_admins")
          .select("*", { count: "exact", head: true })
          .eq("user_id", currentUser.id),
      ])
      setProfile(profileRow ?? null)
      setIsManifestationAdmin((count ?? 0) > 0)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user)
      } else {
        setProfile(null)
        setIsManifestationAdmin(false)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, isManifestationAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
