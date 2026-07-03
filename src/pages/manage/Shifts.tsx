import { useEffect, useState, useCallback, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
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
import { ManageSubNav } from "@/components/manage/manage-sub-nav"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type StaffingMode = Database["public"]["Enums"]["staffing_mode"]
type Secteur = Pick<Database["public"]["Tables"]["secteurs"]["Row"], "id" | "name" | "staffing_mode">
type Shift = Database["public"]["Tables"]["shifts"]["Row"] & { secteurs: { name: string } | null }

export default function ShiftsPage() {
  const { id } = useParams<{ id: string }>()
  const [manifestationStaffingMode, setManifestationStaffingMode] = useState<StaffingMode>("shifts")
  const [secteurs, setSecteurs] = useState<Secteur[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  const fetchData = useCallback(() => {
    if (!id) return
    const supabase = createClient()
    supabase
      .from("manifestations")
      .select("staffing_mode")
      .eq("id", id)
      .single()
      .then(({ data }) => setManifestationStaffingMode(data?.staffing_mode ?? "shifts"))
    supabase
      .from("secteurs")
      .select("id, name, staffing_mode")
      .eq("manifestation_id", id)
      .order("order", { ascending: true })
      .then(({ data }) => setSecteurs(data ?? []))
    supabase
      .from("shifts")
      .select("*, secteurs(name)")
      .eq("manifestation_id", id)
      .order("start_at", { ascending: true, nullsFirst: false })
      .then(({ data }) => setShifts(data ?? []))
  }, [id])

  useEffect(fetchData, [fetchData])

  // Secteurs in "postes" mode are managed directly on the Secteurs page
  // (a single headcount-only shift, no date) -- this page stays reserved
  // for secteurs using dated shifts, to avoid managing the same thing two ways.
  const shiftModeSecteurs = secteurs.filter((s) => (s.staffing_mode ?? manifestationStaffingMode) === "shifts")
  const posteSecteurIds = new Set(
    secteurs.filter((s) => (s.staffing_mode ?? manifestationStaffingMode) === "postes").map((s) => s.id),
  )
  const displayedShifts = shifts.filter((s) => !posteSecteurIds.has(s.secteur_id))

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)

    const { error } = await createClient().from("shifts").insert({
      manifestation_id: id,
      secteur_id: formData.get("secteurId") as string,
      name: formData.get("name") as string,
      start_at: new Date(formData.get("startAt") as string).toISOString(),
      end_at: new Date(formData.get("endAt") as string).toISOString(),
      capacity: Number(formData.get("capacity")),
      description: (formData.get("description") as string) || null,
      location_name: (formData.get("locationName") as string) || null,
      location_maps_url: (formData.get("locationMapsUrl") as string) || null,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    e.currentTarget.reset()
    fetchData()
  }

  async function deleteShift(shiftId: string) {
    const { error } = await createClient().from("shifts").delete().eq("id", shiftId)

    if (error) {
      toast.error(error.message)
      return
    }

    fetchData()
  }

  if (!id) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />
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
            {displayedShifts.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <Link to={`/manage/${id}/shifts/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{s.secteurs?.name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {s.start_at ? new Date(s.start_at).toLocaleString("fr-CH") : "Poste ouvert"}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5 text-muted-foreground" /> {s.capacity}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <ConfirmSubmitButton
                    onConfirm={() => deleteShift(s.id)}
                    variant="ghost"
                    title="Supprimer ce shift ?"
                    description="Cette action est irréversible et supprimera aussi les inscriptions déjà faites sur ce shift."
                  >
                    <Trash2 /> Supprimer
                  </ConfirmSubmitButton>
                </TableCell>
              </TableRow>
            ))}
            {displayedShifts.length === 0 && (
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
          {shiftModeSecteurs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crée d&apos;abord un{" "}
              <Link to={`/manage/${id}/secteurs`} className="underline">
                secteur en mode "shifts horodatés"
              </Link>{" "}
              pour pouvoir ajouter un shift (les secteurs en mode "postes" se gèrent directement
              sur la page Secteurs).
            </p>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="secteurId">Secteur</Label>
                <Select name="secteurId" defaultValue={shiftModeSecteurs[0].id}>
                  <SelectTrigger id="secteurId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftModeSecteurs.map((s) => (
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
                <Label htmlFor="locationName">Lieu</Label>
                <Input id="locationName" name="locationName" placeholder="Salle communale, Lutry" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="locationMapsUrl">Lien Google Maps</Label>
                <Input
                  id="locationMapsUrl"
                  name="locationMapsUrl"
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                />
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
