import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Volunteer = Database["public"]["Tables"]["profiles"]["Row"]

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [totalsByVolunteer, setTotalsByVolunteer] = useState<Map<string, number>>(new Map())
  const [manifestationsByVolunteer, setManifestationsByVolunteer] = useState<Map<string, string[]>>(new Map())
  const [blacklistedIds, setBlacklistedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("profiles")
      .select("*")
      .eq("platform_role", "user")
      .order("created_at", { ascending: false })
      .then(({ data }) => setVolunteers(data ?? []))

    supabase
      .from("points_ledger")
      .select("volunteer_id, points")
      .then(({ data }) => {
        const totals = new Map<string, number>()
        for (const row of data ?? []) {
          totals.set(row.volunteer_id, (totals.get(row.volunteer_id) ?? 0) + row.points)
        }
        setTotalsByVolunteer(totals)
      })

    supabase
      .from("manifestation_engagements")
      .select("volunteer_id, status, manifestations(name)")
      .neq("status", "withdrawn")
      .then(({ data }) => {
        const byVolunteer = new Map<string, string[]>()
        for (const row of data ?? []) {
          if (!row.manifestations) continue
          const names = byVolunteer.get(row.volunteer_id) ?? []
          names.push(row.manifestations.name)
          byVolunteer.set(row.volunteer_id, names)
        }
        setManifestationsByVolunteer(byVolunteer)
      })

    supabase
      .from("volunteer_blacklist")
      .select("volunteer_id")
      .then(({ data }) => setBlacklistedIds(new Set(data?.map((b) => b.volunteer_id))))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Bénévoles</h1>
        <Badge variant="secondary">{volunteers.length}</Badge>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Manifestations</TableHead>
              <TableHead>Inscrit le</TableHead>
              <TableHead>Newsletter</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {volunteers.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    {v.full_name ?? "—"}
                    {blacklistedIds.has(v.id) && (
                      <AlertTriangle className="size-3.5 text-destructive" aria-label="Bénévole dans la liste noire" />
                    )}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{v.email}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {(manifestationsByVolunteer.get(v.id) ?? []).join(", ") || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(v.created_at).toLocaleDateString("fr-CH")}
                </TableCell>
                <TableCell>
                  <Badge variant={v.newsletter_consent ? "default" : "secondary"}>
                    {v.newsletter_consent ? "Oui" : "Non"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{totalsByVolunteer.get(v.id) ?? 0}</TableCell>
              </TableRow>
            ))}
            {volunteers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucun bénévole inscrit pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
