import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { RotateCcw, UserMinus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { Database } from "@/lib/supabase/database.types"

type EngagementStatus = Database["public"]["Enums"]["engagement_status"]
type Engagement = { status: EngagementStatus; manifestations: { id: string; name: string } | null }

const STATUS_LABELS: Record<string, string> = {
  interested: "Intéressé(e)",
  active: "Actif",
  withdrawn: "Retiré(e)",
}

export default function EngagementsPage() {
  const { user } = useAuth()
  const [engagements, setEngagements] = useState<Engagement[] | null>(null)

  const fetchEngagements = useCallback(() => {
    if (!user) return
    createClient()
      .from("manifestation_engagements")
      .select("status, manifestations(id, name)")
      .eq("volunteer_id", user.id)
      .then(({ data }) => setEngagements(data ?? []))
  }, [user])

  useEffect(fetchEngagements, [fetchEngagements])

  async function setEngagementStatus(manifestationId: string, status: EngagementStatus) {
    if (!user) return
    const supabase = createClient()
    const { error } = await supabase
      .from("manifestation_engagements")
      .update({ status })
      .eq("manifestation_id", manifestationId)
      .eq("volunteer_id", user.id)

    if (error) {
      toast.error(error.message)
      return
    }

    fetchEngagements()
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Mes engagements</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manifestation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {engagements?.map((e) => {
              if (!e.manifestations) return null

              return (
                <TableRow key={e.manifestations.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link to={`/manifestations/${e.manifestations.id}`} className="hover:underline">
                      {e.manifestations.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.status === "withdrawn" ? "secondary" : "default"}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === "withdrawn" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEngagementStatus(e.manifestations!.id, "interested")}
                      >
                        <RotateCcw /> Réactiver
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEngagementStatus(e.manifestations!.id, "withdrawn")}
                      >
                        <UserMinus /> Me retirer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {engagements?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Aucun engagement pour l&apos;instant.{" "}
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
