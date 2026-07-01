import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Bénévoles+</h1>
        <p className="text-muted-foreground">
          Retrouve toutes les manifestations du groupement et engage-toi comme bénévole.
        </p>
        {!user && (
          <p className="text-sm">
            <Link href="/login" className="underline">Se connecter</Link>
            {" · "}
            <Link href="/signup" className="underline">Créer un compte</Link>
          </p>
        )}
      </header>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-4">
        {manifestations?.map((m) => {
          const dateRange = formatDateRange(m.start_date, m.end_date)
          const isEngaged = engagedIds.has(m.id)

          return (
            <Card key={m.id} style={{ borderLeftColor: m.color_hex, borderLeftWidth: 4 }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{m.name}</CardTitle>
                  {isEngaged && <Badge>Engagé</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {dateRange && <p className="text-sm text-muted-foreground">{dateRange}</p>}
                {m.description && <p className="text-sm">{m.description}</p>}
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
              </CardContent>
            </Card>
          )
        })}
        {manifestations?.length === 0 && (
          <p className="text-muted-foreground">Aucune manifestation publiée pour l&apos;instant.</p>
        )}
      </div>
    </main>
  )
}
