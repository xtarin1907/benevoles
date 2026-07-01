"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Handles Supabase's classic implicit-flow redirect: GoTrue's own hosted
// /verify endpoint appends the session as a URL hash fragment
// (#access_token=...&refresh_token=...&type=recovery|invite) rather than
// query params -- hash fragments never reach the server, so this has to
// be a Client Component that reads window.location.hash on mount.
// (The query-param `token_hash` flow, if a custom email template ever
// uses it, is handled server-side by src/app/auth/confirm/route.ts.)
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "")
    const params = new URLSearchParams(hash)
    const access_token = params.get("access_token")
    const refresh_token = params.get("refresh_token")

    if (!access_token || !refresh_token) {
      router.replace("/login?error=" + encodeURIComponent("Lien invalide ou expiré."))
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setError(error.message)
        return
      }
      router.replace("/update-password")
    })
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">
        {error ?? "Connexion en cours…"}
      </p>
    </main>
  )
}
