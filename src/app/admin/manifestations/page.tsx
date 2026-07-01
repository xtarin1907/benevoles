import Link from "next/link"
import { Plus } from "lucide-react"
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
import { requireSuperAdmin } from "@/lib/auth/guards"

export default async function ManifestationsPage() {
  const { supabase } = await requireSuperAdmin()

  const { data: manifestations } = await supabase
    .from("manifestations")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Manifestations</h1>
        <Button render={<Link href="/admin/manifestations/new" />}>
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
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {manifestations?.map((m) => (
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
                  <Button variant="ghost" size="sm" render={<Link href={`/manage/${m.id}`} />}>
                    Gérer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {manifestations?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
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
