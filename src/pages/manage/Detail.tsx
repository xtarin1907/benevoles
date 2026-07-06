import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { Mail, UserMinus, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { ConfirmSubmitButton } from "@/components/confirm-submit-button"
import { ManifestationAvatar } from "@/components/manifestation-avatar"
import { ManageSubNav } from "@/components/manage/manage-sub-nav"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Manifestation = Database["public"]["Tables"]["manifestations"]["Row"]
type ShiftSignupMode = Database["public"]["Enums"]["shift_signup_mode"]
type StaffingMode = Database["public"]["Enums"]["staffing_mode"]
type AdminRow = { user_id: string; role: string; profiles: { email: string; full_name: string | null } | null }

export default function ManageManifestationPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [manifestation, setManifestation] = useState<Manifestation | null>(null)
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const isSuperAdmin = profile?.platform_role === "super_admin"

  const fetchData = useCallback(() => {
    if (!id) return
    const supabase = createClient()
    supabase.from("manifestations").select("*").eq("id", id).single().then(({ data }) => setManifestation(data))
    supabase
      .from("manifestation_admins")
      .select("user_id, role, profiles(email, full_name)")
      .eq("manifestation_id", id)
      .then(({ data }) => setAdmins(data ?? []))
  }, [id])

  useEffect(fetchData, [fetchData])

  async function handleBrandingSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    let logoUrl: string | undefined
    if (logoFile) {
      setUploadingLogo(true)
      const ext = logoFile.name.split(".").pop()
      const path = `${id}/logo-${Date.now()}.${ext}`
      // Path is already unique per upload (timestamped), so plain insert is
      // enough -- upsert:true would additionally require a SELECT storage
      // policy (Postgres ON CONFLICT DO UPDATE needs SELECT privilege),
      // which we deliberately don't grant to avoid public bucket listing.
      const { error: uploadError } = await supabase.storage
        .from("manifestation-logos")
        .upload(path, logoFile)
      setUploadingLogo(false)

      if (uploadError) {
        toast.error(uploadError.message)
        return
      }

      logoUrl = supabase.storage.from("manifestation-logos").getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase
      .from("manifestations")
      .update({
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        color_hex: (formData.get("colorHex") as string) || "#7B2E38",
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        start_date: (formData.get("startDate") as string) || null,
        end_date: (formData.get("endDate") as string) || null,
        edition_year: formData.get("editionYear") ? Number(formData.get("editionYear")) : null,
        website_url: (formData.get("websiteUrl") as string) || null,
        contact_email: (formData.get("contactEmail") as string) || null,
        coordinator_name: (formData.get("coordinatorName") as string) || null,
        coordinator_email: (formData.get("coordinatorEmail") as string) || null,
        coordinator_phone: (formData.get("coordinatorPhone") as string) || null,
        shift_signup_mode: formData.get("shiftSignupMode") as ShiftSignupMode,
        staffing_mode: formData.get("staffingMode") as StaffingMode,
        is_published: formData.get("isPublished") === "on",
      })
      .eq("id", id)

    if (error) {
      toast.error(error.message)
      return
    }

    setLogoFile(null)
    toast.success("Manifestation mise à jour.")
    fetchData()
  }

  async function handleInviteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    const { data, error } = await createClient().functions.invoke("invite-manifestation-admin", {
      body: { manifestationId: id, email },
    })

    if (error || data?.error) {
      toast.error(data?.error ?? error.message)
      return
    }

    toast.success(`Invitation envoyée à ${email}.`)
    e.currentTarget.reset()
    fetchData()
  }

  async function removeManifestationAdmin(userId: string) {
    if (!id) return
    const { error } = await createClient()
      .from("manifestation_admins")
      .delete()
      .eq("manifestation_id", id)
      .eq("user_id", userId)

    if (error) {
      toast.error(error.message)
      return
    }

    fetchData()
  }

  if (!manifestation || !id) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />

      {manifestation.approval_status === "pending" && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          En attente de validation par le groupement — tu peux configurer ta manifestation
          (secteurs, shifts, branding) en attendant, mais elle ne pourra pas être publiée avant
          validation.
        </p>
      )}
      {manifestation.approval_status === "rejected" && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Cette manifestation a été refusée par le groupement.
        </p>
      )}

      <Card style={{ borderLeftColor: manifestation.color_hex, borderLeftWidth: 4 }}>
        <CardHeader>
          <CardTitle>{manifestation.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBrandingSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" defaultValue={manifestation.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={manifestation.description ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="logoFile">Logo</Label>
              <div className="flex items-center gap-3">
                <ManifestationAvatar
                  name={manifestation.name}
                  colorHex={manifestation.color_hex}
                  logoUrl={manifestation.logo_url}
                  size="lg"
                />
                <Input
                  id="logoFile"
                  name="logoFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="colorHex">Couleur</Label>
              <Input
                id="colorHex"
                name="colorHex"
                type="color"
                defaultValue={manifestation.color_hex}
                className="h-9 w-16 p-1"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="startDate">Début</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={manifestation.start_date ?? ""}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="endDate">Fin</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={manifestation.end_date ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="editionYear">Année de l&apos;édition (optionnel)</Label>
              <Input
                id="editionYear"
                name="editionYear"
                type="number"
                placeholder="2026"
                defaultValue={manifestation.edition_year ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="websiteUrl">Site web (optionnel)</Label>
              <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={manifestation.website_url ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contactEmail">Email de contact (optionnel)</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={manifestation.contact_email ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">Responsable des bénévoles</p>
              <p className="text-xs text-muted-foreground">
                Reçoit un email à chaque inscription/annulation de shift. Peut être modifié à
                tout moment (changement de responsable en cours d&apos;année ou d&apos;édition).
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="coordinatorName">Nom</Label>
                <Input
                  id="coordinatorName"
                  name="coordinatorName"
                  defaultValue={manifestation.coordinator_name ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="coordinatorEmail">Email</Label>
                <Input
                  id="coordinatorEmail"
                  name="coordinatorEmail"
                  type="email"
                  defaultValue={manifestation.coordinator_email ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="coordinatorPhone">Téléphone (optionnel — pour un futur envoi SMS)</Label>
                <Input
                  id="coordinatorPhone"
                  name="coordinatorPhone"
                  type="tel"
                  defaultValue={manifestation.coordinator_phone ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shiftSignupMode">Inscription aux shifts</Label>
              <Select name="shiftSignupMode" defaultValue={manifestation.shift_signup_mode}>
                <SelectTrigger id="shiftSignupMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_confirm">Automatique</SelectItem>
                  <SelectItem value="admin_approval">Validation par un admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="staffingMode">Mode de staffing par défaut</Label>
              <Select name="staffingMode" defaultValue={manifestation.staffing_mode}>
                <SelectTrigger id="staffingMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shifts">Shifts horodatés</SelectItem>
                  <SelectItem value="postes">Postes par quantité</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Chaque secteur peut surcharger ce mode individuellement sur la page Secteurs.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={manifestation.is_published}
                disabled={!isSuperAdmin && manifestation.approval_status !== "approved"}
              />
              Publiée (visible sur la landing page)
            </label>
            {!isSuperAdmin && manifestation.approval_status !== "approved" && (
              <p className="text-xs text-muted-foreground">
                La publication est désactivée tant que le groupement n&apos;a pas validé cette
                manifestation.
              </p>
            )}
            <Button type="submit" disabled={uploadingLogo}>
              {uploadingLogo ? "Envoi du logo..." : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" /> Admins de la manifestation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {admins.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between gap-2">
                <span>
                  {a.profiles?.full_name ?? a.profiles?.email}{" "}
                  <Badge variant="secondary">{a.role}</Badge>
                </span>
                {isSuperAdmin && (
                  <ConfirmSubmitButton
                    onConfirm={() => removeManifestationAdmin(a.user_id)}
                    variant="ghost"
                    title="Retirer cet admin ?"
                    description="Cette personne perdra immédiatement l'accès à la gestion de cette manifestation."
                  >
                    <UserMinus /> Retirer
                  </ConfirmSubmitButton>
                )}
              </li>
            ))}
            {admins.length === 0 && (
              <li className="text-muted-foreground">Aucun admin pour l&apos;instant.</li>
            )}
          </ul>

          {isSuperAdmin ? (
            <form onSubmit={handleInviteSubmit} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="email">Inviter un admin par email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <Button type="submit">
                <Mail /> Inviter
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seul le super admin peut inviter ou retirer des admins.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
