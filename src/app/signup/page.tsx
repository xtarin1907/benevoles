import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signup } from "./actions"

export default async function SignupPage(props: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await props.searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Créer un compte bénévole</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signup} className="flex flex-col gap-4">
            {next && <input type="hidden" name="next" value={next} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">S&apos;inscrire</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
