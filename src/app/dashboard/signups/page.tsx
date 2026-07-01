import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"

const STATUS_LABELS: Record<string, string> = {
  applied: "En attente de validation",
  confirmed: "Confirmé",
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

export default async function SignupsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: signups } = await supabase
    .from("shift_signups")
    .select("status, shifts(id, name, start_at, manifestation_id, manifestations(name))")
    .eq("volunteer_id", user!.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Mes inscriptions</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manifestation</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signups?.map((s, i) =>
              s.shifts ? (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    <Link href={`/manifestations/${s.shifts.manifestation_id}`} className="hover:underline">
                      {s.shifts.manifestations?.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {s.shifts.name} — {new Date(s.shifts.start_at).toLocaleString("fr-CH")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[s.status] ?? "secondary"}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ) : null,
            )}
            {signups?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Aucune inscription pour l&apos;instant.{" "}
                  <Link href="/" className="underline">Voir les manifestations</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
