import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlashToast } from "@/components/flash-toast"
import { login } from "./actions"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>
}) {
  const { error, message, next } = await props.searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:p-8">
      <FlashToast message={message} error={error} />
      <Link href="/" className="text-lg font-semibold">
        Bénévoles+
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            {next && <input type="hidden" name="next" value={next} />}
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
                autoComplete="current-password"
              />
            </div>
            <Button type="submit">Se connecter</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Pas de compte ?{" "}
            <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="underline">
              S&apos;inscrire
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
