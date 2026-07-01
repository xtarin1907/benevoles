import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireManifestationAccess } from "@/lib/auth/guards"
import { createSecteur, deleteSecteur } from "./actions"

export default async function SecteursPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await props.params
  const { supabase } = await requireManifestationAccess(id)
  const { error } = await props.searchParams

  const { data: secteurs } = await supabase
    .from("secteurs")
    .select("*")
    .eq("manifestation_id", id)
    .order("order", { ascending: true })

  const createSecteurWithId = createSecteur.bind(null, id)

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Secteurs</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {secteurs?.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <form action={deleteSecteur.bind(null, id, s.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Supprimer
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {secteurs?.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                Aucun secteur pour l&apos;instant.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau secteur</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSecteurWithId} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="colorHex">Couleur (optionnel, hérite de la manifestation sinon)</Label>
              <Input id="colorHex" name="colorHex" type="color" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit">Créer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
