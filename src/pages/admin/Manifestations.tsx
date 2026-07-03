import { useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Check, Plus, X } from "lucide-react"
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
import type { Database } from "@/lib/supabase/database.types"

type Manifestation = Database["public"]["Tables"]["manifestations"]["Row"]
type ApprovalStatus = Database["public"]["Enums"]["manifestation_approval_status"]

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: "En attente de validation",
  approved: "Validée",
  rejected: "Refusée",
}

const APPROVAL_VARIANTS: Record<ApprovalStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
}

export default function AdminManifestationsPage() {
  const [manifestations, setManifestations] = useState<Manifestation[]>([])

  const fetchData = useCallback(() => {
    createClient()
      .from("manifestations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setManifestations(data ?? []))
  }, [])

  useEffect(fetchData, [fetchData])

  async function updateApproval(id: string, approval_status: ApprovalStatus) {
    const { error } = await createClient().from("manifestations").update({ approval_status }).eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  const pendingCount = manifestations.filter((m) => m.approval_status === "pending").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          Manifestations
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingCount} en attente de validation
            </Badge>
          )}
        </h1>
        <Button render={<Link to="/admin/manifestations/new" />}>
          <Plus /> Nouvelle manifestation
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Inscription shifts</TableHead>
              <TableHead>Publication</TableHead>
              <TableHead>Validation</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {manifestations.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                <TableCell>
                  <span
                    className="inline-block size-4 rounded-full border"
                    style={{ backgroundColor: m.color_hex }}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {m.shift_signup_mode === "auto_confirm" ? "Automatique" : "Validation admin"}
                </TableCell>
                <TableCell>
                  <Badge variant={m.is_published ? "default" : "secondary"}>
                    {m.is_published ? "Publiée" : "Brouillon"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={APPROVAL_VARIANTS[m.approval_status]}>
                    {APPROVAL_LABELS[m.approval_status]}
                  </Badge>
                </TableCell>
                <TableCell className="flex flex-wrap justify-end gap-2">
                  {m.approval_status === "pending" && (
                    <>
                      <Button type="button" size="sm" onClick={() => updateApproval(m.id, "approved")}>
                        <Check /> Approuver
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateApproval(m.id, "rejected")}
                      >
                        <X /> Refuser
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" render={<Link to={`/manage/${m.id}`} />}>
                    Gérer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {manifestations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucune manifestation pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
