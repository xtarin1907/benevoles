import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarClock, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FlashToast } from "@/components/flash-toast"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { SiteHeader } from "@/components/site-header"
import { createClient } from "@/lib/supabase/server"
import { signUpForShift } from "./actions"

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

export default async function ManifestationPublicPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { id } = await props.params
  const { error, message } = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: manifestation } = await supabase
    .from("manifestations")
    .select("*")
    .eq("id", id)
    .single()

  if (!manifestation) {
    notFound()
  }

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, secteurs(name)")
    .eq("manifestation_id", id)
    .order("start_at", { ascending: true })

  // Own signups only -- RLS restricts shift_signups reads to the caller's
  // own rows, so this can't also show "X places restantes" (that would
  // need an aggregate count across everyone's signups). create_shift_signup()
  // still enforces capacity server-side even though the UI doesn't display
  // it -- v1 simplification, revisit if volunteers ask for it.
  const { data: mySignups } = user
    ? await supabase.from("shift_signups").select("shift_id, status").eq("volunteer_id", user.id)
    : { data: null }

  const myStatusByShift = new Map(mySignups?.map((s) => [s.shift_id, s.status]))
  const signUpWithManifestationId = signUpForShift.bind(null, id)

  return (
    <div className="min-h-screen">
      <FlashToast message={message} error={error} />
      <SiteHeader
        navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []}
        userEmail={user?.email}
      />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <div>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
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

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Shifts</h2>
          {shifts?.map((s) => {
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
                  {!myStatus &&
                    (user ? (
                      <form action={signUpWithManifestationId.bind(null, s.id)}>
                        <Button type="submit" size="sm">
                          S&apos;inscrire
                        </Button>
                      </form>
                    ) : (
                      <Button
                        size="sm"
                        render={
                          <Link
                            href={`/signup?next=${encodeURIComponent(`/manifestations/${id}`)}`}
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
          {shifts?.length === 0 && (
            <p className="rounded-md bg-muted/50 p-4 text-center text-muted-foreground">
              Aucun shift ouvert pour l&apos;instant.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
