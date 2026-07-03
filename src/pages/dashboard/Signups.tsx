import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmSubmitButton } from "@/components/confirm-submit-button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

type Signup = {
  id: string
  status: string
  shifts: {
    id: string
    name: string
    start_at: string | null
    location_name: string | null
    manifestation_id: string
    manifestations: { name: string } | null
  } | null
}

const CANCELABLE_STATUSES = new Set(["applied", "confirmed", "waitlisted"])

const STATUS_LABELS: Record<string, string> = {
  applied: "En attente de validation",
  confirmed: "Confirmé",
  declined: "Refusée",
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

export default function SignupsPage() {
  const { user } = useAuth()
  const [signups, setSignups] = useState<Signup[] | null>(null)

  const fetchSignups = useCallback(() => {
    if (!user) return
    createClient()
      .from("shift_signups")
      .select("id, status, shifts(id, name, start_at, location_name, manifestation_id, manifestations(name))")
      .eq("volunteer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSignups(data ?? []))
  }, [user])

  useEffect(fetchSignups, [fetchSignups])

  async function cancelSignup(signupId: string) {
    const supabase = createClient()
    const { error } = await supabase.from("shift_signups").update({ status: "declined" }).eq("id", signupId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Inscription annulée.")
    fetchSignups()

    // Best-effort: the coordinator email is a convenience notification,
    // not part of the cancellation's own success/failure.
    supabase.functions
      .invoke("notify-coordinator", { body: { shiftSignupId: signupId, action: "cancelled" } })
      .catch(() => {})
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Mes inscriptions</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manifestation</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {signups?.map((s) =>
              s.shifts ? (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link to={`/manifestations/${s.shifts.manifestation_id}`} className="hover:underline">
                      {s.shifts.manifestations?.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {s.shifts.name} —{" "}
                    {s.shifts.start_at ? new Date(s.shifts.start_at).toLocaleString("fr-CH") : "Poste ouvert"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {s.shifts.location_name && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5" /> {s.shifts.location_name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[s.status] ?? "secondary"}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {CANCELABLE_STATUSES.has(s.status) && (
                      <ConfirmSubmitButton
                        onConfirm={() => cancelSignup(s.id)}
                        variant="ghost"
                        title="Annuler cette inscription ?"
                        description="Ta place se libère immédiatement pour un autre bénévole."
                      >
                        Annuler
                      </ConfirmSubmitButton>
                    )}
                  </TableCell>
                </TableRow>
              ) : null,
            )}
            {signups?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
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
