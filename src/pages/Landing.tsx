import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  Globe,
  Mail,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { BrandLogo } from "@/components/brand-logo"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Manifestation = Database["public"]["Tables"]["manifestations"]["Row"]
type Partner = Database["public"]["Tables"]["partners"]["Row"]
type ImpactStats = Database["public"]["Functions"]["platform_impact_stats"]["Returns"][number]

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

// One card per series (grouping editions of the same recurring event) --
// picks the nearest upcoming edition, or the most recent past one if none
// is upcoming, so a series with multiple years doesn't show a redundant
// card per edition (roadmap "Nouvelle vague" §10).
function featuredManifestationsBySeries(manifestations: Manifestation[]): Manifestation[] {
  const groups = new Map<string, Manifestation[]>()
  for (const m of manifestations) {
    const key = m.series_id ?? m.id
    const group = groups.get(key) ?? []
    group.push(m)
    groups.set(key, group)
  }

  const today = new Date().toISOString().slice(0, 10)
  const featured: Manifestation[] = []
  for (const group of groups.values()) {
    const upcoming = group
      .filter((m) => m.start_date && m.start_date >= today)
      .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))
    const past = group
      .filter((m) => m.start_date && m.start_date < today)
      .sort((a, b) => (a.start_date! > b.start_date! ? -1 : 1))
    featured.push(upcoming[0] ?? past[0] ?? group[0])
  }
  return featured
}

export default function LandingPage() {
  const { user } = useAuth()
  const [manifestations, setManifestations] = useState<Manifestation[] | null>(null)
  const [engagedIds, setEngagedIds] = useState<Set<string>>(new Set())
  const [seekingVolunteers, setSeekingVolunteers] = useState<{ manifestation_id: string; name: string }[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [stats, setStats] = useState<ImpactStats | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Public-safe impact aggregates (grand totals only) for the stats band.
    supabase.rpc("platform_impact_stats").then(({ data }) => setStats(data?.[0] ?? null))

    // Same query as the /partenaires page -- visible partners, ordered.
    supabase
      .from("partners")
      .select("*")
      .eq("is_visible", true)
      .order("order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => setPartners(data ?? []))

    // Consolidated calendar (v1): all published manifestations sorted by
    // start date, so a visitor sees what's coming up and when -- a full
    // calendar-grid widget is deferred until there's a real need for one.
    supabase
      .from("manifestations")
      .select("*")
      .eq("is_published", true)
      .order("start_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => setManifestations(data ?? []))

    supabase.rpc("manifestations_seeking_volunteers").then(({ data }) => setSeekingVolunteers(data ?? []))

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

  const featured = manifestations ? featuredManifestationsBySeries(manifestations) : null

  // Only surface impact tiles that carry a real number -- showing "0 bénévoles"
  // on a fresh platform reads as empty, so zero-valued tiles are dropped and
  // the whole band hides when nothing is worth showing.
  const impactTiles = (stats
    ? [
        { icon: CalendarDays, value: stats.manifestations_count, label: "manifestations" },
        { icon: Users, value: stats.volunteers_count, label: "bénévoles" },
        { icon: Clock, value: Math.round(stats.volunteer_hours), label: "heures de bénévolat" },
      ]
    : []
  ).filter((t) => t.value > 0)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []}
        userEmail={user?.email}
      />
      <section className="relative overflow-hidden border-b bg-background px-4 py-12 text-center sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url(/hero-lavaux.jpg)" }}
        />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4">
          <BrandLogo className="size-16" />
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
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link to="/organisateurs" className="underline underline-offset-2">
              Vous organisez une manifestation ? →
            </Link>
            <Link to="/partenaires" className="underline underline-offset-2">
              Nos partenaires →
            </Link>
          </div>
        </div>
      </section>

      {seekingVolunteers.length > 0 && (
        <div className="overflow-hidden border-b bg-primary py-2 text-primary-foreground">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4">
            <Megaphone className="size-4 shrink-0" />
            <span className="shrink-0 text-sm font-semibold">Cherchent encore des bénévoles :</span>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex shrink-0 animate-marquee items-center text-sm">
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    className="flex shrink-0 items-center gap-2 pr-12"
                    aria-hidden={copy === 1}
                  >
                    {seekingVolunteers.map((m, i) => (
                      <span key={m.manifestation_id} className="flex items-center gap-2 whitespace-nowrap">
                        <Link
                          to={`/manifestations/${m.manifestation_id}`}
                          className="underline underline-offset-2 hover:opacity-80"
                        >
                          {m.name}
                        </Link>
                        {i < seekingVolunteers.length - 1 && <span>·</span>}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {impactTiles.length > 0 && (
        <section className="border-b bg-muted/30 px-4 py-10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-center gap-x-16 gap-y-6 text-center">
            {impactTiles.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className="size-5 text-primary" />
                <span className="text-2xl font-bold tracking-tight sm:text-4xl">
                  {value.toLocaleString("fr-CH")}
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-4 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Manifestations à venir</h2>
          <p className="text-sm text-muted-foreground">
            Rejoins l&apos;une des manifestations du groupement et choisis tes shifts.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {featured?.map((m, i) => {
            const dateRange = formatDateRange(m.start_date, m.end_date)
            const isEngaged = engagedIds.has(m.id)

            return (
              <Card
                key={m.id}
                className="animate-in fade-in slide-in-from-bottom-2 flex flex-col transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                style={{
                  borderTopColor: m.color_hex,
                  borderTopWidth: 4,
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <Dialog>
                  <DialogTrigger render={<CardHeader className="cursor-pointer" />}>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <ManifestationAvatar name={m.name} colorHex={m.color_hex} logoUrl={m.logo_url} size="lg" />
                      <CardTitle className="text-sm leading-tight">{m.name}</CardTitle>
                      {isEngaged && <Badge>Engagé</Badge>}
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{m.name}</DialogTitle>
                      {m.description && <DialogDescription>{m.description}</DialogDescription>}
                    </DialogHeader>
                    <div className="flex flex-col gap-2 text-sm">
                      {m.website_url && (
                        <a
                          href={m.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 hover:underline"
                        >
                          <Globe className="size-3.5 text-muted-foreground" /> {m.website_url}
                        </a>
                      )}
                      {m.contact_email && (
                        <a href={`mailto:${m.contact_email}`} className="flex items-center gap-1.5 hover:underline">
                          <Mail className="size-3.5 text-muted-foreground" /> {m.contact_email}
                        </a>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <CardContent className="flex flex-1 flex-col gap-2">
                  {dateRange && (
                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" /> {dateRange}
                    </p>
                  )}
                  <div className="mt-auto flex flex-col gap-2">
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
          {featured?.length === 0 && (
            <p className="col-span-full rounded-md bg-muted/50 p-4 text-center text-muted-foreground">
              Aucune manifestation publiée pour l&apos;instant.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 pt-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Pourquoi devenir bénévole ?</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Le groupement d&apos;associations de Lavaux réunit les manifestations de la
            région et leurs équipes bénévoles. Un seul compte pour t&apos;engager partout,
            cumuler des points et vivre les événements de l&apos;intérieur.
          </p>
        </div>
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

        {partners.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Nos partenaires</h2>
              <Link
                to="/partenaires"
                className="flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Voir tous nos partenaires <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-6">
              {partners.map((partner) => {
                const tile = (
                  <div className="flex aspect-square items-center justify-center rounded-lg border bg-white p-3 transition-shadow hover:shadow-md">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={partner.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 className="size-6 text-muted-foreground" />
                    )}
                  </div>
                )
                return partner.website_url ? (
                  <a
                    key={partner.id}
                    href={partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={partner.name}
                  >
                    {tile}
                  </a>
                ) : (
                  <div key={partner.id} title={partner.name}>
                    {tile}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
