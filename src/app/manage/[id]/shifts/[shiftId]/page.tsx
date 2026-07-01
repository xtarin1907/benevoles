import { notFound } from "next/navigation"
import { Check, CheckCircle2, Users, X } from "lucide-react"
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
import { FlashToast } from "@/components/flash-toast"
import { requireManifestationAccess } from "@/lib/auth/guards"
import { updateSignupStatus } from "./actions"

const STATUS_LABELS: Record<string, string> = {
  applied: "En attente",
  confirmed: "Confirmé",
  declined: "Refusé",
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
  const confirmedCount = signups?.filter((s) => s.status === "confirmed" || s.status === "completed").length ?? 0

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <FlashToast error={error} />
      <Card>
        <CardHeader>
          <CardTitle>{shift.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p><span className="text-muted-foreground">Secteur :</span> {shift.secteurs?.name}</p>
          <p><span className="text-muted-foreground">Début :</span> {new Date(shift.start_at).toLocaleString("fr-CH")}</p>
          <p><span className="text-muted-foreground">Fin :</span> {new Date(shift.end_at).toLocaleString("fr-CH")}</p>
          <p className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Capacité :</span> {confirmedCount} / {shift.capacity}
          </p>
          {shift.description && <p className="mt-2">{shift.description}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bénévole</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {signups?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {s.profiles?.full_name ?? s.profiles?.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[s.status] ?? "secondary"}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex flex-wrap justify-end gap-2">
                      {requiresApproval && s.status === "applied" && (
                        <>
                          <form action={updateStatus.bind(null, s.id, "confirmed")}>
                            <Button type="submit" size="sm">
                              <Check /> Accepter
                            </Button>
                          </form>
                          <form action={updateStatus.bind(null, s.id, "declined")}>
                            <Button type="submit" variant="ghost" size="sm">
                              <X /> Refuser
                            </Button>
                          </form>
                        </>
                      )}
                      {s.status === "confirmed" && (
                        <form action={updateStatus.bind(null, s.id, "completed")}>
                          <Button type="submit" variant="outline" size="sm">
                            <CheckCircle2 /> Marquer effectué
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {signups?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Aucune inscription pour l&apos;instant.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
