import { useEffect, useState, useCallback } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CalendarClock, ExternalLink, MapPin, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { SiteHeader } from "@/components/site-header"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Manifestation = Database["public"]["Tables"]["manifestations"]["Row"]
type Shift = Database["public"]["Tables"]["shifts"]["Row"] & { secteurs: { name: string } | null }

const STATUS_LABELS: Record<string, string> = {
  applied: "En attente de validation",
  confirmed: "Inscrit(e)",
  declined: "Refusée",
  completed: "Effectué",
  no_show: "Absent",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "secondary",
  confirmed: "default",
  declined: "destructive",
  completed: "outline",
  no_show: "destructive",
}

export default function ManifestationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [manifestation, setManifestation] = useState<Manifestation | null | undefined>(undefined)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [myStatusByShift, setMyStatusByShift] = useState<Map<string, string>>(new Map())

  const fetchData = useCallback(() => {
    if (!id) return
    const supabase = createClient()

    supabase.from("manifestations").select("*").eq("id", id).single().then(({ data }) => setManifestation(data))

    supabase
      .from("shifts")
      .select("*, secteurs(name)")
      .eq("manifestation_id", id)
      .order("start_at", { ascending: true })
      .then(({ data }) => setShifts(data ?? []))

    // Own signups only -- RLS restricts shift_signups reads to the caller's
    // own rows, so this can't also show "X places restantes" (that would
    // need an aggregate count across everyone's signups). create_shift_signup()
    // still enforces capacity server-side even though the UI doesn't display
    // it -- v1 simplification, revisit if volunteers ask for it.
    if (user) {
      supabase
        .from("shift_signups")
        .select("shift_id, status")
        .eq("volunteer_id", user.id)
        .then(({ data }) => setMyStatusByShift(new Map(data?.map((s) => [s.shift_id, s.status]))))
    }
  }, [id, user])

  useEffect(fetchData, [fetchData])

  async function signUpForShift(shiftId: string) {
    if (!user || !id) return
    const supabase = createClient()
    // create_shift_signup() (SECURITY DEFINER) checks capacity and picks the
    // right initial status (confirmed/applied) per the manifestation's
    // shift_signup_mode -- see supabase/migrations for why this can't be
    // plain RLS/CHECK constraints (atomicity against concurrent signups).
    const { error } = await supabase.rpc("create_shift_signup", { _shift_id: shiftId })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Inscription enregistrée.")
    fetchData()
  }

  if (manifestation === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Manifestation introuvable.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []}
        userEmail={user?.email}
      />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        {manifestation && (
          <div>
            <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
              <ArrowLeft className="size-3.5" /> Toutes les manifestations
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <ManifestationAvatar
                name={manifestation.name}
                colorHex={manifestation.color_hex}
                logoUrl={manifestation.logo_url}
                size="lg"
              />
              <h1 className="text-2xl font-semibold">{manifestation.name}</h1>
            </div>
            {manifestation.description && <p className="mt-3">{manifestation.description}</p>}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Shifts</h2>
          {shifts.map((s) => {
            const myStatus = myStatusByShift.get(s.id)

            return (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    {myStatus && (
                      <Badge variant={STATUS_VARIANTS[myStatus] ?? "secondary"}>
                        {STATUS_LABELS[myStatus] ?? myStatus}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {s.secteurs?.name && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="size-3.5" /> {s.secteurs.name}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-muted-foreground" />
                    {new Date(s.start_at).toLocaleString("fr-CH")} – {new Date(s.end_at).toLocaleTimeString("fr-CH")}
                  </p>
                  {s.location_name && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="size-3.5" /> {s.location_name}
                    </p>
                  )}
                  {s.location_maps_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      render={
                        <a href={s.location_maps_url} target="_blank" rel="noopener noreferrer" />
                      }
                    >
                      <ExternalLink /> Itinéraire
                    </Button>
                  )}
                  {!myStatus &&
                    (user ? (
                      <Button type="button" size="sm" onClick={() => signUpForShift(s.id)}>
                        S&apos;inscrire
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        render={
                          <Link
                            to={`/signup?next=${encodeURIComponent(`/manifestations/${id}`)}`}
                          />
                        }
                      >
                        S&apos;inscrire
                      </Button>
                    ))}
                </CardContent>
              </Card>
            )
          })}
          {shifts.length === 0 && (
            <p className="rounded-md bg-muted/50 p-4 text-center text-muted-foreground">
              Aucun shift ouvert pour l&apos;instant.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
