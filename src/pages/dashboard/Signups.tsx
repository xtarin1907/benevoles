import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
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
import { useAuth } from "@/contexts/AuthContext"

type Signup = {
  status: string
  shifts: {
    id: string
    name: string
    start_at: string
    manifestation_id: string
    manifestations: { name: string } | null
  } | null
}

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

export default function SignupsPage() {
  const { user } = useAuth()
  const [signups, setSignups] = useState<Signup[] | null>(null)

  useEffect(() => {
    if (!user) return
    createClient()
      .from("shift_signups")
      .select("status, shifts(id, name, start_at, manifestation_id, manifestations(name))")
      .eq("volunteer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSignups(data ?? []))
  }, [user])

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
                    <Link to={`/manifestations/${s.shifts.manifestation_id}`} className="hover:underline">
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
                  <Link to="/" className="underline">Voir les manifestations</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
