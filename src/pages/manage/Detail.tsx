import { useEffect, useState, useCallback, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { LayoutGrid, Mail, UserMinus, Users } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Manifestation = Database["public"]["Tables"]["manifestations"]["Row"]
type ShiftSignupMode = Database["public"]["Enums"]["shift_signup_mode"]
type AdminRow = { user_id: string; role: string; profiles: { email: string; full_name: string | null } | null }

export default function ManageManifestationPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [manifestation, setManifestation] = useState<Manifestation | null>(null)
  const [admins, setAdmins] = useState<AdminRow[]>([])
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

    const { error } = await createClient()
      .from("manifestations")
      .update({
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        color_hex: (formData.get("colorHex") as string) || "#6366f1",
        logo_url: (formData.get("logoUrl") as string) || null,
        start_date: (formData.get("startDate") as string) || null,
        end_date: (formData.get("endDate") as string) || null,
        shift_signup_mode: formData.get("shiftSignupMode") as ShiftSignupMode,
        is_published: formData.get("isPublished") === "on",
      })
      .eq("id", id)

    if (error) {
      toast.error(error.message)
      return
    }

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

  if (!manifestation) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <nav className="flex gap-2 overflow-x-auto text-sm">
        <Button variant="secondary" size="sm" disabled className="shrink-0">
          <LayoutGrid /> Branding
        </Button>
        <Button variant="ghost" size="sm" render={<Link to={`/manage/${id}/secteurs`} />} className="shrink-0">
          Secteurs
        </Button>
        <Button variant="ghost" size="sm" render={<Link to={`/manage/${id}/shifts`} />} className="shrink-0">
          Shifts
        </Button>
        <Button variant="ghost" size="sm" render={<Link to={`/manage/${id}/newsletter`} />} className="shrink-0">
          <Mail /> Newsletter
        </Button>
      </nav>

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
              <Label htmlFor="logoUrl">Logo (URL)</Label>
              <Input id="logoUrl" name="logoUrl" type="url" defaultValue={manifestation.logo_url ?? ""} />
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={manifestation.is_published}
              />
              Publiée (visible sur la landing page)
            </label>
            <Button type="submit">Enregistrer</Button>
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
