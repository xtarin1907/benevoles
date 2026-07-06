import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { safeNext } from "@/lib/auth/safe-next"
import { useAuth } from "@/contexts/AuthContext"

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const

export default function SignupPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const next = searchParams.get("next")
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to={safeNext(next)} replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const passwordConfirm = formData.get("passwordConfirm") as string
    const fullName = formData.get("fullName") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const tshirtSize = formData.get("tshirtSize") as string
    const dateOfBirth = formData.get("dateOfBirth") as string
    const newsletterConsent = formData.get("newsletterConsent") === "on"

    if (password !== passwordConfirm) {
      toast.error("Les deux mots de passe ne correspondent pas.")
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // Read by handle_new_user() to seed the matching profiles columns --
      // newsletter_consent is an explicit opt-in, unchecked by default
      // (CLAUDE.md non-négociable).
      options: {
        data: {
          full_name: fullName,
          phone,
          address,
          tshirt_size: tshirtSize || null,
          date_of_birth: dateOfBirth || null,
          newsletter_consent: newsletterConsent,
        },
      },
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
        Bénévoles Lavaux
      </Link>
      <Card className="w-full max-w-md">
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
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" required autoComplete="street-address" />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="tshirtSize">Taille de t-shirt</Label>
                <Select name="tshirtSize" required>
                  <SelectTrigger id="tshirtSize">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TSHIRT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="dateOfBirth">Date de naissance (optionnel)</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" autoComplete="bday" />
              </div>
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="passwordConfirm">Confirmer le mot de passe</Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
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
