import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireManifestationAccess } from "@/lib/auth/guards"
import { updateSignupStatus } from "./actions"

const STATUS_LABELS: Record<string, string> = {
  applied: "En attente",
  confirmed: "Confirmé",
  declined: "Refusé",
  completed: "Effectué",
  no_show: "Absent",
}

export default async function ShiftDetailPage(props: {
  params: Promise<{ id: string; shiftId: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id, shiftId } = await props.params
  const { supabase } = await requireManifestationAccess(id)
  const { error } = await props.searchParams

  const { data: shift } = await supabase
    .from("shifts")
    .select("*, secteurs(name)")
    .eq("id", shiftId)
    .single()

  if (!shift) {
    notFound()
  }

  const { data: manifestation } = await supabase
    .from("manifestations")
    .select("shift_signup_mode")
    .eq("id", id)
    .single()

  const { data: signups } = await supabase
    .from("shift_signups")
    .select("id, status, notes, profiles(email, full_name)")
    .eq("shift_id", shiftId)

  const requiresApproval = manifestation?.shift_signup_mode === "admin_approval"
  const updateStatus = updateSignupStatus.bind(null, id, shiftId)

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{shift.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p><span className="text-muted-foreground">Secteur :</span> {shift.secteurs?.name}</p>
          <p><span className="text-muted-foreground">Début :</span> {new Date(shift.start_at).toLocaleString("fr-CH")}</p>
          <p><span className="text-muted-foreground">Fin :</span> {new Date(shift.end_at).toLocaleString("fr-CH")}</p>
          <p><span className="text-muted-foreground">Capacité :</span> {shift.capacity}</p>
          {shift.description && <p className="mt-2">{shift.description}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bénévole</TableHead>
                <TableHead>Statut</TableHead>
                {requiresApproval && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {signups?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.profiles?.full_name ?? s.profiles?.email}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "confirmed" ? "default" : "secondary"}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                  {requiresApproval && (
                    <TableCell className="flex gap-2">
                      {s.status === "applied" && (
                        <>
                          <form action={updateStatus.bind(null, s.id, "confirmed")}>
                            <Button type="submit" size="sm">
                              Accepter
                            </Button>
                          </form>
                          <form action={updateStatus.bind(null, s.id, "declined")}>
                            <Button type="submit" variant="ghost" size="sm">
                              Refuser
                            </Button>
                          </form>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {signups?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={requiresApproval ? 3 : 2} className="text-center text-muted-foreground">
                    Aucune inscription pour l&apos;instant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
