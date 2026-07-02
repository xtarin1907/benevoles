import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
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
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Secteur = Database["public"]["Tables"]["secteurs"]["Row"]

export default function SecteursPage() {
  const { id } = useParams<{ id: string }>()
  const [secteurs, setSecteurs] = useState<Secteur[]>([])

  const fetchSecteurs = useCallback(() => {
    if (!id) return
    createClient()
      .from("secteurs")
      .select("*")
      .eq("manifestation_id", id)
      .order("order", { ascending: true })
      .then(({ data }) => setSecteurs(data ?? []))
  }, [id])

  useEffect(fetchSecteurs, [fetchSecteurs])

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)

    const { error } = await createClient().from("secteurs").insert({
      manifestation_id: id,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      color_hex: (formData.get("colorHex") as string) || null,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    e.currentTarget.reset()
    fetchSecteurs()
  }

  async function deleteSecteur(secteurId: string) {
    const { error } = await createClient().from("secteurs").delete().eq("id", secteurId)

    if (error) {
      toast.error(error.message)
      return
    }

    fetchSecteurs()
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
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
            {secteurs.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-right">
                  <ConfirmSubmitButton
                    onConfirm={() => deleteSecteur(s.id)}
                    variant="ghost"
                    title="Supprimer ce secteur ?"
                    description="Cette action est irréversible et supprimera aussi tous les shifts de ce secteur."
                  >
                    <Trash2 /> Supprimer
                  </ConfirmSubmitButton>
                </TableCell>
              </TableRow>
            ))}
            {secteurs.length === 0 && (
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
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
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
