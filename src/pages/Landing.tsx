import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { CalendarClock, CalendarDays, HeartHandshake, Sparkles, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { SiteHeader } from "@/components/site-header"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Manifestation = Database["public"]["Tables"]["manifestations"]["Row"]

const BENEFITS = [
  {
    icon: Sparkles,
    title: "Cumule des points",
    text: "Chaque inscription et chaque shift effectué te rapporte des points.",
  },
  {
    icon: Users,
    title: "Rejoins une communauté",
    text: "Rencontre d'autres bénévoles et fais partie des équipes qui font vivre l'événement.",
  },
  {
    icon: CalendarClock,
    title: "Des shifts flexibles",
    text: "Choisis les créneaux qui t'arrangent, sur une ou plusieurs manifestations.",
  },
]

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  return fmt((start ?? end)!)
}

export default function LandingPage() {
  const { user } = useAuth()
  const [manifestations, setManifestations] = useState<Manifestation[] | null>(null)
  const [engagedIds, setEngagedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    // Consolidated calendar (v1): all published manifestations sorted by
    // start date, so a visitor sees what's coming up and when -- a full
    // calendar-grid widget is deferred until there's a real need for one.
    supabase
      .from("manifestations")
      .select("*")
      .eq("is_published", true)
      .order("start_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => setManifestations(data ?? []))

    if (user) {
      supabase
        .from("manifestation_engagements")
        .select("manifestation_id")
        .eq("volunteer_id", user.id)
        .then(({ data }) => setEngagedIds(new Set(data?.map((e) => e.manifestation_id))))
    }
  }, [user])

  async function engageWithManifestation(manifestationId: string) {
    if (!user) return
    const supabase = createClient()
    // Upsert: a volunteer can only engage once per manifestation
    // (manifestation_engagements has a UNIQUE(manifestation_id, volunteer_id)
    // constraint) -- re-clicking "S'engager" after already engaging is a
    // no-op, not an error.
    const { error } = await supabase
      .from("manifestation_engagements")
      .upsert(
        { manifestation_id: manifestationId, volunteer_id: user.id, status: "interested" },
        { onConflict: "manifestation_id,volunteer_id", ignoreDuplicates: true },
      )

    if (error) {
      toast.error(error.message)
      return
    }

    setEngagedIds((prev) => new Set(prev).add(manifestationId))
    toast.success("Tu es engagé sur cette manifestation !")
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []}
        userEmail={user?.email}
      />
      <section className="border-b bg-linear-to-b from-background to-muted/40 px-4 py-12 text-center sm:py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <HeartHandshake className="size-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Vis les manifestations <span className="text-gradient">de l&apos;intérieur</span>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Rejoins les équipes bénévoles du groupement : choisis tes shifts, cumule des
            points, fais partie de l&apos;aventure.
          </p>
          {!user && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="animate-pulse-subtle" render={<Link to="/signup" />}>
                Devenir bénévole
              </Button>
              <Button size="lg" variant="ghost" render={<Link to="/login" />}>
                Se connecter
              </Button>
            </div>
          )}
        </div>
      </section>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <Card
              key={title}
              className="transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {manifestations?.map((m, i) => {
            const dateRange = formatDateRange(m.start_date, m.end_date)
            const isEngaged = engagedIds.has(m.id)

            return (
              <Card
                key={m.id}
                className="animate-in fade-in slide-in-from-bottom-2 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                style={{
                  borderLeftColor: m.color_hex,
                  borderLeftWidth: 4,
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <ManifestationAvatar name={m.name} colorHex={m.color_hex} logoUrl={m.logo_url} />
                      <CardTitle>
                        <Link to={`/manifestations/${m.id}`} className="hover:underline">
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
                        <Button type="button" size="sm" onClick={() => engageWithManifestation(m.id)}>
                          S&apos;engager
                        </Button>
                      ) : (
                        <Button size="sm" render={<Link to={`/signup?next=${encodeURIComponent("/")}`} />}>
                          S&apos;engager
                        </Button>
                      ))}
                    <Button variant="outline" size="sm" render={<Link to={`/manifestations/${m.id}`} />}>
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
