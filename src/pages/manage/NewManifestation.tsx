import { type FormEvent } from "react"
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const supabase = createClient()

    const { data, error } = await supabase
      .from("manifestations")
      .insert({
        name,
        slug: slugify(name),
        description: (formData.get("description") as string) || null,
        color_hex: (formData.get("colorHex") as string) || "#6366f1",
        shift_signup_mode: formData.get("shiftSignupMode") as ShiftSignupMode,
        approval_status: "pending",
        is_published: false,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error) {
      toast.error(error.message)
      return
    }

    const { error: adminError } = await supabase
      .from("manifestation_admins")
      .insert({ manifestation_id: data.id, user_id: user.id, role: "owner" })

    if (adminError) {
      toast.error(adminError.message)
      return
    }

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
