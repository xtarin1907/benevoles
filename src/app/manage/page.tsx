import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { createClient } from "@/lib/supabase/server"

export default async function ManagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single()

  const manifestations =
    profile?.platform_role === "super_admin"
      ? (await supabase.from("manifestations").select("*").order("created_at", { ascending: false }))
          .data
      : (
          await supabase
            .from("manifestation_admins")
            .select("manifestations(*)")
            .eq("user_id", user.id)
        ).data?.map((row) => row.manifestations).filter((m) => m !== null)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Mes manifestations</h1>
      <div className="flex flex-col gap-3">
        {manifestations?.map((m) => (
          <Link key={m.id} href={`/manage/${m.id}`}>
            <Card
              className="transition-shadow hover:shadow-md"
              style={{ borderLeftColor: m.color_hex, borderLeftWidth: 4 }}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <ManifestationAvatar name={m.name} colorHex={m.color_hex} logoUrl={m.logo_url} size="sm" />
                    <CardTitle className="text-base">{m.name}</CardTitle>
                  </div>
                  <Badge variant={m.is_published ? "default" : "secondary"}>
                    {m.is_published ? "Publiée" : "Brouillon"}
                  </Badge>
                </div>
              </CardHeader>
              {m.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
        {(!manifestations || manifestations.length === 0) && (
          <p className="rounded-md bg-muted/50 p-4 text-center text-muted-foreground">
            Tu n&apos;administres aucune manifestation pour l&apos;instant.
          </p>
        )}
      </div>
    </div>
  )
}
