import Link from "next/link"
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manifestations</h1>
        <Button render={<Link href="/admin/manifestations/new" />}>
          Nouvelle manifestation
        </Button>
      </div>

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
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell>
                <span
                  className="inline-block h-4 w-4 rounded-full border"
                  style={{ backgroundColor: m.color_hex }}
                />
              </TableCell>
              <TableCell>
                {m.shift_signup_mode === "auto_confirm" ? "Automatique" : "Validation admin"}
              </TableCell>
              <TableCell>
                <Badge variant={m.is_published ? "default" : "secondary"}>
                  {m.is_published ? "Publiée" : "Brouillon"}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/admin/manifestations/${m.id}`} className="text-sm underline">
                  Gérer
                </Link>
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
  )
}
