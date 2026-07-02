import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get("next")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string
    const newsletterConsent = formData.get("newsletterConsent") === "on"

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // Read by handle_new_user() to seed profiles.newsletter_consent --
      // explicit opt-in, unchecked by default (CLAUDE.md non-négociable).
      options: { data: { full_name: fullName, newsletter_consent: newsletterConsent } },
    })
    setSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Compte créé, vérifie ton email pour confirmer.")
    navigate(next && next.startsWith("/") ? `/login?next=${encodeURIComponent(next)}` : "/login")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:p-8">
      <Link to="/" className="text-lg font-semibold">
        Bénévoles+
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Créer un compte bénévole</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <label className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
              <input type="checkbox" name="newsletterConsent" className="mt-1" />
              <span>
                J&apos;accepte de recevoir des newsletters du groupement (annonces de
                manifestations, appels à bénévoles). Consentement facultatif, modifiable à tout
                moment depuis mon profil.
              </span>
            </label>
            <Button type="submit" disabled={submitting}>
              S&apos;inscrire
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
