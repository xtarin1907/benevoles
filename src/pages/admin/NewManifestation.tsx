import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
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
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type ShiftSignupMode = Database["public"]["Enums"]["shift_signup_mode"]
type SourceManifestation = Pick<
  Database["public"]["Tables"]["manifestations"]["Row"],
  "id" | "name" | "color_hex" | "logo_url" | "shift_signup_mode" | "series_id"
>

const NONE_VALUE = "__none__"

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export default function NewManifestationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sources, setSources] = useState<SourceManifestation[]>([])
  const [sourceId, setSourceId] = useState(NONE_VALUE)

  useEffect(() => {
    createClient()
      .from("manifestations")
      .select("id, name, color_hex, logo_url, shift_signup_mode, series_id")
      .order("name", { ascending: true })
      .then(({ data }) => setSources(data ?? []))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const editionYear = formData.get("editionYear") as string
    const source = sources.find((s) => s.id === sourceId)
    const supabase = createClient()

    // "Nouvelle édition de..." : reuse the source's series (creating one on
    // the fly if the source wasn't already part of one) and branding, but
    // never clone secteurs/shifts -- those are date-specific and the admin
    // recreates them for the new edition.
    let seriesId = source?.series_id ?? null
    if (source && !seriesId) {
      const { data: series, error: seriesError } = await supabase
        .from("manifestation_series")
        .insert({ name: source.name })
        .select("id")
        .single()
      if (seriesError) {
        toast.error(seriesError.message)
        return
      }
      seriesId = series.id
      await supabase.from("manifestations").update({ series_id: seriesId }).eq("id", source.id)
    }

    const { data, error } = await supabase
      .from("manifestations")
      .insert({
        name,
        slug: slugify(name),
        description: (formData.get("description") as string) || null,
        color_hex: (formData.get("colorHex") as string) || source?.color_hex || "#6366f1",
        logo_url: source?.logo_url ?? null,
        shift_signup_mode: (formData.get("shiftSignupMode") as ShiftSignupMode) || source?.shift_signup_mode,
        series_id: seriesId,
        edition_year: editionYear ? Number(editionYear) : null,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    if (source) {
      const { data: admins } = await supabase
        .from("manifestation_admins")
        .select("user_id, role")
        .eq("manifestation_id", source.id)

      if (admins?.length) {
        await supabase.from("manifestation_admins").insert(
          admins.map((a) => ({ manifestation_id: data.id, user_id: a.user_id, role: a.role })),
        )
      }
    }

    navigate(`/manage/${data.id}`)
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nouvelle manifestation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sourceId">Nouvelle édition de... (optionnel)</Label>
            <Select value={sourceId} onValueChange={(value) => setSourceId(value ?? NONE_VALUE)}>
              <SelectTrigger id="sourceId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Aucune — manifestation indépendante</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Reprend la couleur, le logo et le mode d&apos;inscription de la manifestation
              choisie, et donne accès aux mêmes admins. Secteurs et shifts ne sont pas repris
              (à recréer pour cette édition).
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="editionYear">Année de l&apos;édition (optionnel)</Label>
            <Input id="editionYear" name="editionYear" type="number" placeholder="2026" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="colorHex">Couleur</Label>
            <Input id="colorHex" name="colorHex" type="color" defaultValue="#6366f1" className="h-9 w-16 p-1" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shiftSignupMode">Inscription aux shifts</Label>
            <Select name="shiftSignupMode" defaultValue="auto_confirm">
              <SelectTrigger id="shiftSignupMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto_confirm">Automatique</SelectItem>
                <SelectItem value="admin_approval">Validation par un admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Créer</Button>
        </form>
      </CardContent>
    </Card>
  )
}
