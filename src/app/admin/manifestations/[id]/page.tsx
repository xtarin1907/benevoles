import { notFound } from "next/navigation"
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
import { requireSuperAdmin } from "@/lib/auth/guards"
import {
  inviteManifestationAdmin,
  removeManifestationAdmin,
  updateManifestation,
} from "../actions"

export default async function EditManifestationPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { supabase } = await requireSuperAdmin()
  const { id } = await props.params
  const { error, message } = await props.searchParams

  const { data: manifestation } = await supabase
    .from("manifestations")
    .select("*")
    .eq("id", id)
    .single()

  if (!manifestation) {
    notFound()
  }

  const { data: admins } = await supabase
    .from("manifestation_admins")
    .select("user_id, role, invited_at, profiles(email, full_name)")
    .eq("manifestation_id", id)

  const updateManifestationWithId = updateManifestation.bind(null, id)
  const inviteAdminWithId = inviteManifestationAdmin.bind(null, id)

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{manifestation.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateManifestationWithId} className="flex flex-col gap-4">
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
              <Label htmlFor="colorHex">Couleur</Label>
              <Input
                id="colorHex"
                name="colorHex"
                type="color"
                defaultValue={manifestation.color_hex}
              />
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admins de la manifestation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {admins?.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between">
                <span>
                  {a.profiles?.full_name ?? a.profiles?.email} ({a.role})
                </span>
                <form action={removeManifestationAdmin.bind(null, id, a.user_id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Retirer
                  </Button>
                </form>
              </li>
            ))}
            {admins?.length === 0 && (
              <li className="text-muted-foreground">Aucun admin pour l&apos;instant.</li>
            )}
          </ul>

          <form action={inviteAdminWithId} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="email">Inviter un admin par email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit">Inviter</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
