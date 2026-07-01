import { Trash2 } from "lucide-react"
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
import { ConfirmSubmitButton } from "@/components/confirm-submit-button"
import { FlashToast } from "@/components/flash-toast"
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
      <FlashToast error={error} />
      <h1 className="text-xl font-semibold">Secteurs</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {secteurs?.map((s) => {
              const formId = `delete-secteur-${s.id}`
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">
                    <form id={formId} action={deleteSecteur.bind(null, id, s.id)} />
                    <ConfirmSubmitButton
                      formId={formId}
                      variant="ghost"
                      title="Supprimer ce secteur ?"
                      description="Cette action est irréversible et supprimera aussi tous les shifts de ce secteur."
                    >
                      <Trash2 /> Supprimer
                    </ConfirmSubmitButton>
                  </TableCell>
                </TableRow>
              )
            })}
            {secteurs?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Aucun secteur pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
              <Input id="colorHex" name="colorHex" type="color" className="h-9 w-16 p-1" />
            </div>
            <Button type="submit">Créer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
