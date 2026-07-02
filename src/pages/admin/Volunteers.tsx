import { useEffect, useState } from "react"
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
              <TableHead>Inscrit le</TableHead>
              <TableHead>Newsletter</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {volunteers.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium whitespace-nowrap">{v.full_name ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{v.email}</TableCell>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground">
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
