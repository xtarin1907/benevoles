import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// Handles Supabase's classic implicit-flow redirect: GoTrue's own hosted
// /verify endpoint appends the session as a URL hash fragment
// (#access_token=...&refresh_token=...&type=recovery|invite) rather than
// query params -- this must run client-side to read window.location.hash.
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    const params = new URLSearchParams(hash)
    const access_token = params.get("access_token")
    const refresh_token = params.get("refresh_token")

    if (!access_token || !refresh_token) {
      navigate("/login?error=" + encodeURIComponent("Lien invalide ou expiré."), { replace: true })
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setError(error.message)
        return
      }
      navigate("/update-password", { replace: true })
    })
  }, [navigate])

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Connexion en cours…
        </p>
      )}
    </main>
  )
}
