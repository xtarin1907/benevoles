import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlashToast } from "@/components/flash-toast"
import { createClient } from "@/lib/supabase/server"
import { updatePassword } from "./actions"

export default async function UpdatePasswordPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // updateUser() requires an active session, established either by
  // /auth/callback (hash-fragment flow) or /auth/confirm (token_hash
  // flow) just before landing here.
  if (!user) {
    redirect("/login")
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <FlashToast error={error} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choisir un mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit">Valider</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
