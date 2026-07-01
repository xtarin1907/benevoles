import Link from "next/link"
import { Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { createShift, deleteShift } from "./actions"

export default async function ShiftsPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await props.params
  const { supabase } = await requireManifestationAccess(id)
  const { error } = await props.searchParams

  const { data: secteurs } = await supabase
    .from("secteurs")
    .select("id, name")
    .eq("manifestation_id", id)
    .order("order", { ascending: true })

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, secteurs(name)")
    .eq("manifestation_id", id)
    .order("start_at", { ascending: true })

  const createShiftWithId = createShift.bind(null, id)

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <FlashToast error={error} />
      <h1 className="text-xl font-semibold">Shifts</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Capacité</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts?.map((s) => {
              const formId = `delete-shift-${s.id}`
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link href={`/manage/${id}/shifts/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{s.secteurs?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(s.start_at).toLocaleString("fr-CH")}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5 text-muted-foreground" /> {s.capacity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <form id={formId} action={deleteShift.bind(null, id, s.id)} />
                    <ConfirmSubmitButton
                      formId={formId}
                      variant="ghost"
                      title="Supprimer ce shift ?"
                      description="Cette action est irréversible et supprimera aussi les inscriptions déjà faites sur ce shift."
                    >
                      <Trash2 /> Supprimer
                    </ConfirmSubmitButton>
                  </TableCell>
                </TableRow>
              )
            })}
            {shifts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun shift pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau shift</CardTitle>
        </CardHeader>
        <CardContent>
          {!secteurs || secteurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crée d&apos;abord un{" "}
              <Link href={`/manage/${id}/secteurs`} className="underline">
                secteur
              </Link>{" "}
              pour pouvoir ajouter un shift.
            </p>
          ) : (
            <form action={createShiftWithId} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="secteurId">Secteur</Label>
                <Select name="secteurId" defaultValue={secteurs[0].id}>
                  <SelectTrigger id="secteurId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {secteurs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="startAt">Début</Label>
                  <Input id="startAt" name="startAt" type="datetime-local" required />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="endAt">Fin</Label>
                  <Input id="endAt" name="endAt" type="datetime-local" required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="capacity">Capacité (nombre de bénévoles)</Label>
                <Input id="capacity" name="capacity" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <Button type="submit">Créer</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
