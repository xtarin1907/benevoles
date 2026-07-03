import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ManageSubNav } from "@/components/manage/manage-sub-nav"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Secteur = Database["public"]["Tables"]["secteurs"]["Row"]
type StaffingMode = Database["public"]["Enums"]["staffing_mode"]

const INHERIT_VALUE = "__inherit__"

export default function SecteursPage() {
  const { id } = useParams<{ id: string }>()
  const [secteurs, setSecteurs] = useState<Secteur[]>([])
  const [manifestationStaffingMode, setManifestationStaffingMode] = useState<StaffingMode>("shifts")
  // secteur_id -> { shiftId, capacity } for the single dateless "poste" shift.
  const [posteShifts, setPosteShifts] = useState<Map<string, { shiftId: string; capacity: number }>>(new Map())

  const fetchSecteurs = useCallback(() => {
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
      .select("*")
      .eq("manifestation_id", id)
      .order("order", { ascending: true })
      .then(({ data }) => setSecteurs(data ?? []))

    supabase
      .from("shifts")
      .select("id, secteur_id, capacity")
      .eq("manifestation_id", id)
      .is("start_at", null)
      .then(({ data }) => {
        const byId = new Map<string, { shiftId: string; capacity: number }>()
        for (const row of data ?? []) {
          byId.set(row.secteur_id, { shiftId: row.id, capacity: row.capacity })
        }
        setPosteShifts(byId)
      })
  }, [id])

  useEffect(fetchSecteurs, [fetchSecteurs])

  function effectiveMode(s: Secteur): StaffingMode {
    return s.staffing_mode ?? manifestationStaffingMode
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    const staffingModeValue = formData.get("staffingMode") as string

    const { error } = await createClient().from("secteurs").insert({
      manifestation_id: id,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      color_hex: (formData.get("colorHex") as string) || null,
      staffing_mode: staffingModeValue === INHERIT_VALUE ? null : (staffingModeValue as StaffingMode),
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

  async function updateStaffingMode(secteurId: string, value: string) {
    const { error } = await createClient()
      .from("secteurs")
      .update({ staffing_mode: value === INHERIT_VALUE ? null : (value as StaffingMode) })
      .eq("id", secteurId)

    if (error) {
      toast.error(error.message)
      return
    }

    fetchSecteurs()
  }

  async function updatePosteCapacity(secteur: Secteur, capacity: number) {
    if (!id || !Number.isFinite(capacity) || capacity < 1) return
    const supabase = createClient()
    const existing = posteShifts.get(secteur.id)

    const { error } = existing
      ? await supabase.from("shifts").update({ capacity }).eq("id", existing.shiftId)
      : await supabase.from("shifts").insert({
          manifestation_id: id,
          secteur_id: secteur.id,
          name: secteur.name,
          capacity,
          start_at: null,
          end_at: null,
        })

    if (error) {
      toast.error(error.message)
      return
    }

    fetchSecteurs()
  }

  if (!id) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />
      <h1 className="text-xl font-semibold">Secteurs</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Bénévoles nécessaires</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {secteurs.map((s) => {
              const mode = effectiveMode(s)
              const poste = posteShifts.get(s.id)

              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                  <TableCell>
                    <Select
                      value={s.staffing_mode ?? INHERIT_VALUE}
                      onValueChange={(value) => updateStaffingMode(s.id, value ?? INHERIT_VALUE)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={INHERIT_VALUE}>
                          Hérite ({manifestationStaffingMode === "postes" ? "postes" : "shifts"})
                        </SelectItem>
                        <SelectItem value="shifts">Shifts horodatés</SelectItem>
                        <SelectItem value="postes">Postes par quantité</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mode === "postes" ? (
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        defaultValue={poste?.capacity ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const value = Number(e.target.value)
                          if (value && value !== poste?.capacity) {
                            updatePosteCapacity(s, value)
                          }
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
              )
            })}
            {secteurs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="staffingMode">Mode de staffing</Label>
              <Select name="staffingMode" defaultValue={INHERIT_VALUE}>
                <SelectTrigger id="staffingMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INHERIT_VALUE}>
                    Hérite ({manifestationStaffingMode === "postes" ? "postes" : "shifts"})
                  </SelectItem>
                  <SelectItem value="shifts">Shifts horodatés</SelectItem>
                  <SelectItem value="postes">Postes par quantité</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Créer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
