import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "./actions"

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await props.searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Se connecter</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Pas de compte ? <Link href="/signup" className="underline">S&apos;inscrire</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
