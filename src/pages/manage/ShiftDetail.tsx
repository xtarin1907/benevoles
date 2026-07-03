import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, Check, CheckCircle2, UserX, Users, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ManageSubNav } from "@/components/manage/manage-sub-nav"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Shift = Database["public"]["Tables"]["shifts"]["Row"] & { secteurs: { name: string } | null }
type ShiftSignupStatus = Database["public"]["Enums"]["shift_signup_status"]
type Signup = {
  id: string
  status: ShiftSignupStatus
  notes: string | null
  volunteer_id: string
  profiles: { email: string; full_name: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  applied: "En attente",
  confirmed: "Confirmé",
  declined: "Refusé",
  completed: "Effectué",
  no_show: "Absent",
  waitlisted: "En réserve",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "secondary",
  confirmed: "default",
  declined: "destructive",
  completed: "outline",
  no_show: "destructive",
  waitlisted: "secondary",
}

export default function ShiftDetailPage() {
  const { id, shiftId } = useParams<{ id: string; shiftId: string }>()
  const [shift, setShift] = useState<Shift | null | undefined>(undefined)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [signups, setSignups] = useState<Signup[]>([])
  const [blacklistedIds, setBlacklistedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(() => {
    if (!id || !shiftId) return
    const supabase = createClient()

    supabase
      .from("shifts")
      .select("*, secteurs(name)")
      .eq("id", shiftId)
      .single()
      .then(({ data }) => setShift(data))

    supabase
      .from("manifestations")
      .select("shift_signup_mode")
      .eq("id", id)
      .single()
      .then(({ data }) => setRequiresApproval(data?.shift_signup_mode === "admin_approval"))

    supabase
      .from("shift_signups")
      .select("id, status, notes, volunteer_id, profiles(email, full_name)")
      .eq("shift_id", shiftId)
      .then(({ data }) => setSignups(data ?? []))

    supabase
      .from("volunteer_blacklist")
      .select("volunteer_id")
      .then(({ data }) => setBlacklistedIds(new Set(data?.map((b) => b.volunteer_id))))
  }, [id, shiftId])

  useEffect(fetchData, [fetchData])

  async function handleLocationSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!shiftId) return
    const formData = new FormData(e.currentTarget)

    const { error } = await createClient()
      .from("shifts")
      .update({
        location_name: (formData.get("locationName") as string) || null,
        location_maps_url: (formData.get("locationMapsUrl") as string) || null,
      })
      .eq("id", shiftId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Lieu mis à jour.")
    fetchData()
  }

  async function updateSignupStatus(signupId: string, status: ShiftSignupStatus) {
    const { error } = await createClient().from("shift_signups").update({ status }).eq("id", signupId)

    if (error) {
      toast.error(error.message)
      return
    }

    fetchData()
  }

  if (!shift || !id) return null

  const confirmedCount = signups.filter((s) => s.status === "confirmed" || s.status === "completed").length
  const waitlistedCount = signups.filter((s) => s.status === "waitlisted").length

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />
      <Card>
        <CardHeader>
          <CardTitle>{shift.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p><span className="text-muted-foreground">Secteur :</span> {shift.secteurs?.name}</p>
          {shift.start_at && shift.end_at ? (
            <>
              <p><span className="text-muted-foreground">Début :</span> {new Date(shift.start_at).toLocaleString("fr-CH")}</p>
              <p><span className="text-muted-foreground">Fin :</span> {new Date(shift.end_at).toLocaleString("fr-CH")}</p>
            </>
          ) : (
            <p><span className="text-muted-foreground">Horaire :</span> Poste ouvert (pas d&apos;horaire fixe)</p>
          )}
          <p className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Capacité :</span> {confirmedCount} / {shift.capacity}
            {waitlistedCount > 0 && ` (+ ${waitlistedCount} en réserve)`}
          </p>
          {shift.description && <p className="mt-2">{shift.description}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lieu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLocationSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="locationName">Lieu</Label>
              <Input
                id="locationName"
                name="locationName"
                placeholder="Salle communale, Lutry"
                defaultValue={shift.location_name ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="locationMapsUrl">Lien Google Maps</Label>
              <Input
                id="locationMapsUrl"
                name="locationMapsUrl"
                type="url"
                placeholder="https://maps.google.com/?q=..."
                defaultValue={shift.location_maps_url ?? ""}
              />
            </div>
            <Button type="submit" size="sm" className="self-start">
              Enregistrer
            </Button>
          </form>
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
                {signups.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {s.profiles?.full_name ?? s.profiles?.email}
                        {blacklistedIds.has(s.volunteer_id) && (
                          <AlertTriangle
                            className="size-3.5 text-destructive"
                            aria-label="Bénévole dans la liste noire"
                          />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[s.status] ?? "secondary"}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex flex-wrap justify-end gap-2">
                      {requiresApproval && s.status === "applied" && (
                        <>
                          <Button type="button" size="sm" onClick={() => updateSignupStatus(s.id, "confirmed")}>
                            <Check /> Accepter
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSignupStatus(s.id, "declined")}
                          >
                            <X /> Refuser
                          </Button>
                        </>
                      )}
                      {s.status === "confirmed" && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateSignupStatus(s.id, "completed")}
                          >
                            <CheckCircle2 /> Marquer effectué
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSignupStatus(s.id, "no_show")}
                          >
                            <UserX /> Marquer absent
                          </Button>
                        </>
                      )}
                      {s.status === "waitlisted" && (
                        <Button type="button" size="sm" onClick={() => updateSignupStatus(s.id, "confirmed")}>
                          <Check /> Confirmer (place libérée)
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {signups.length === 0 && (
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
