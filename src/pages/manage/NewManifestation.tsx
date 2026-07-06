import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// Self-serve creation (roadmap §16): unlike admin/NewManifestation.tsx,
// this is reachable by any authenticated user. The manifestation is always
// created unpublished and pending -- the guard trigger on `manifestations`
// blocks publishing before a super_admin approves it, regardless of what
// this form submits.
export default function NewManifestationSelfServePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const supabase = createClient()

    setSubmitting(true)
    const { data, error } = await supabase
      .from("manifestations")
      .insert({
        name,
        slug: slugify(name),
        description: (formData.get("description") as string) || null,
        color_hex: (formData.get("colorHex") as string) || "#7B2E38",
        start_date: (formData.get("startDate") as string) || null,
        end_date: (formData.get("endDate") as string) || null,
        website_url: (formData.get("websiteUrl") as string) || null,
        contact_email: (formData.get("contactEmail") as string) || null,
        coordinator_name: (formData.get("coordinatorName") as string) || null,
        coordinator_email: (formData.get("coordinatorEmail") as string) || null,
        coordinator_phone: (formData.get("coordinatorPhone") as string) || null,
        shift_signup_mode: formData.get("shiftSignupMode") as ShiftSignupMode,
        approval_status: "pending",
        is_published: false,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error) {
      setSubmitting(false)
      toast.error(error.message)
      return
    }

    // L'admin doit être bootstrapé AVANT l'upload du logo : la policy
    // d'écriture du bucket manifestation-logos exige is_manifestation_admin,
    // qui n'est vrai qu'une fois cette ligne insérée (le créateur n'est pas
    // encore admin de sa propre manifestation juste après l'insert).
    const { error: adminError } = await supabase
      .from("manifestation_admins")
      .insert({ manifestation_id: data.id, user_id: user.id, role: "owner" })

    if (adminError) {
      setSubmitting(false)
      toast.error(adminError.message)
      return
    }

    if (logoFile) {
      const ext = logoFile.name.split(".").pop()
      const path = `${data.id}/logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("manifestation-logos").upload(path, logoFile)
      if (uploadError) {
        setSubmitting(false)
        toast.error(uploadError.message)
        return
      }
      const logoUrl = supabase.storage.from("manifestation-logos").getPublicUrl(path).data.publicUrl
      await supabase.from("manifestations").update({ logo_url: logoUrl }).eq("id", data.id)
    }

    setSubmitting(false)
    toast.success("Manifestation créée — en attente de validation par le groupement.")
    navigate(`/manage/${data.id}`)
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Créer ma manifestation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Une fois créée, ta manifestation reste en brouillon jusqu&apos;à validation par le
            groupement. Tu peux la configurer (secteurs, shifts, branding) dès maintenant.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="logoFile">Logo (optionnel)</Label>
            <Input
              id="logoFile"
              name="logoFile"
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="colorHex">Couleur</Label>
            <Input id="colorHex" name="colorHex" type="color" defaultValue="#7B2E38" className="h-9 w-16 p-1" />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="startDate">Début (optionnel)</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="endDate">Fin (optionnel)</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="websiteUrl">Site web (optionnel)</Label>
            <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://..." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactEmail">Email de contact (optionnel)</Label>
            <Input id="contactEmail" name="contactEmail" type="email" />
          </div>
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm font-medium">Responsable des bénévoles (optionnel)</p>
            <p className="text-xs text-muted-foreground">
              Reçoit un email à chaque inscription/annulation de shift. Modifiable à tout moment
              depuis la page de branding.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="coordinatorName">Nom</Label>
              <Input id="coordinatorName" name="coordinatorName" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="coordinatorEmail">Email</Label>
              <Input id="coordinatorEmail" name="coordinatorEmail" type="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="coordinatorPhone">Téléphone (optionnel — pour un futur envoi SMS)</Label>
              <Input id="coordinatorPhone" name="coordinatorPhone" type="tel" />
            </div>
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
          <Button type="submit" disabled={submitting}>
            {submitting ? "Création..." : "Créer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
