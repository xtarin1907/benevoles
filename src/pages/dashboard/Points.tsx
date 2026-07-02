import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

type LedgerRow = {
  id: string
  points: number
  event_type: string
  created_at: string
  manifestations: { name: string } | null
}

const EVENT_LABELS: Record<string, string> = {
  signup: "Inscription",
  shift_completed: "Shift effectué",
  manual_adjustment: "Ajustement",
}

export default function PointsPage() {
  const { user } = useAuth()
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null)

  useEffect(() => {
    if (!user) return
    createClient()
      .from("points_ledger")
      .select("*, manifestations(name)")
      .eq("volunteer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLedger(data ?? []))
  }, [user])

  const total = ledger?.reduce((sum, row) => sum + row.points, 0) ?? 0

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Mes points</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" /> Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{total}</p>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manifestation</TableHead>
              <TableHead>Événement</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger?.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{row.manifestations?.name ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {EVENT_LABELS[row.event_type] ?? row.event_type}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString("fr-CH")}
                </TableCell>
                <TableCell className="text-right font-medium">+{row.points}</TableCell>
              </TableRow>
            ))}
            {ledger?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun point pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
