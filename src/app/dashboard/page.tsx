import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Proves the full chain: proxy.ts -> cookie -> server client -> RLS-scoped
  // read via "users can view their own profile" policy on public.profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p><span className="text-muted-foreground">Nom :</span> {profile?.full_name ?? "—"}</p>
          <p><span className="text-muted-foreground">Email :</span> {profile?.email}</p>
          <p><span className="text-muted-foreground">Rôle :</span> {profile?.platform_role}</p>
          <p><span className="text-muted-foreground">Inscrit le :</span> {profile?.created_at}</p>
        </CardContent>
      </Card>
    </main>
  )
}
