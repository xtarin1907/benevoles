import { type FormEvent } from "react"
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string

    const { data, error } = await createClient()
      .from("manifestations")
      .insert({
        name,
        slug: slugify(name),
        description: (formData.get("description") as string) || null,
        color_hex: (formData.get("colorHex") as string) || "#6366f1",
        shift_signup_mode: formData.get("shiftSignupMode") as ShiftSignupMode,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error) {
      toast.error(error.message)
      return
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
