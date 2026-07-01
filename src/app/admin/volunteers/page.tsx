import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireSuperAdmin } from "@/lib/auth/guards"

export default async function VolunteersPage() {
  const { supabase } = await requireSuperAdmin()

  const { data: volunteers } = await supabase
    .from("profiles")
    .select("*")
    .eq("platform_role", "user")
    .order("created_at", { ascending: false })

  const { data: pointsRows } = await supabase.from("points_ledger").select("volunteer_id, points")

  const totalsByVolunteer = new Map<string, number>()
  for (const row of pointsRows ?? []) {
    totalsByVolunteer.set(row.volunteer_id, (totalsByVolunteer.get(row.volunteer_id) ?? 0) + row.points)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Bénévoles</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Inscrit le</TableHead>
            <TableHead>Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {volunteers?.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="font-medium">{v.full_name ?? "—"}</TableCell>
              <TableCell>{v.email}</TableCell>
              <TableCell>{new Date(v.created_at).toLocaleDateString("fr-CH")}</TableCell>
              <TableCell>{totalsByVolunteer.get(v.id) ?? 0}</TableCell>
            </TableRow>
          ))}
          {volunteers?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Aucun bénévole inscrit pour l&apos;instant.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
