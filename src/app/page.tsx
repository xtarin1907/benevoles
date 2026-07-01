import Link from "next/link"
import { CalendarDays, HeartHandshake } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FlashToast } from "@/components/flash-toast"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { SiteHeader } from "@/components/site-header"
import { createClient } from "@/lib/supabase/server"
import { engageWithManifestation } from "./actions"

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return fmt((start ?? end)!)
}

export default async function LandingPage(props: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Consolidated calendar (v1): all published manifestations sorted by
  // start date, so a visitor sees what's coming up and when -- a full
  // calendar-grid widget is deferred until there's a real need for one.
  const { data: manifestations } = await supabase
    .from("manifestations")
    .select("*")
    .eq("is_published", true)
    .order("start_date", { ascending: true, nullsFirst: false })

  const { data: engagements } = user
    ? await supabase
        .from("manifestation_engagements")
        .select("manifestation_id")
        .eq("volunteer_id", user.id)
    : { data: null }

  const engagedIds = new Set(engagements?.map((e) => e.manifestation_id))

  return (
    <div className="min-h-screen">
      <FlashToast message={message} error={error} />
      <SiteHeader
        navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []}
        userEmail={user?.email}
      />
      <section className="border-b bg-background px-4 py-12 text-center sm:py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <HeartHandshake className="size-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bénévoles+</h1>
          <p className="text-lg text-muted-foreground">
            Retrouve toutes les manifestations du groupement, choisis tes shifts et cumule
            tes points de bénévole.
          </p>
          {!user && (
            <div className="flex justify-center gap-3">
              <Button render={<Link href="/login" />}>Se connecter</Button>
              <Button variant="outline" render={<Link href="/signup" />}>
                Créer un compte bénévole
              </Button>
            </div>
          )}
        </div>
      </section>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-col gap-4">
          {manifestations?.map((m) => {
            const dateRange = formatDateRange(m.start_date, m.end_date)
            const isEngaged = engagedIds.has(m.id)

            return (
              <Card
                key={m.id}
                className="transition-shadow hover:shadow-md"
                style={{ borderLeftColor: m.color_hex, borderLeftWidth: 4 }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <ManifestationAvatar name={m.name} colorHex={m.color_hex} logoUrl={m.logo_url} />
                      <CardTitle>
                        <Link href={`/manifestations/${m.id}`} className="hover:underline">
                          {m.name}
                        </Link>
                      </CardTitle>
                    </div>
                    {isEngaged && <Badge>Engagé</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {dateRange && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarDays className="size-4" /> {dateRange}
                    </p>
                  )}
                  {m.description && <p className="text-sm">{m.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {!isEngaged &&
                      (user ? (
                        <form action={engageWithManifestation.bind(null, m.id)}>
                          <Button type="submit" size="sm">
                            S&apos;engager
                          </Button>
                        </form>
                      ) : (
                        <Button size="sm" render={<Link href={`/signup?next=${encodeURIComponent("/")}`} />}>
                          S&apos;engager
                        </Button>
                      ))}
                    <Button variant="outline" size="sm" render={<Link href={`/manifestations/${m.id}`} />}>
                      Voir les shifts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {manifestations?.length === 0 && (
            <p className="rounded-md bg-muted/50 p-4 text-center text-muted-foreground">
              Aucune manifestation publiée pour l&apos;instant.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
