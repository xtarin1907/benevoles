import { type FormEvent } from "react"
import { toast } from "sonner"
import { Mail } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type TshirtSize = Database["public"]["Enums"]["tshirt_size"]

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  user: "Bénévole",
}

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const

export default function DashboardProfilePage() {
  const { user, profile } = useAuth()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)
    const consent = formData.get("newsletterConsent") === "on"

    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ newsletter_consent: consent })
      .eq("id", user.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Préférences mises à jour.")
  }

  async function handleDetailsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const formData = new FormData(e.currentTarget)
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const tshirtSize = formData.get("tshirtSize") as string
    const dateOfBirth = formData.get("dateOfBirth") as string

    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({
        phone: phone || null,
        address: address || null,
        tshirt_size: (tshirtSize || null) as TshirtSize | null,
        date_of_birth: dateOfBirth || null,
      })
      .eq("id", user.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Informations mises à jour.")
  }

  return (
    <div className="flex max-w-sm flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p><span className="text-muted-foreground">Nom :</span> {profile?.full_name ?? "—"}</p>
          <p><span className="text-muted-foreground">Email :</span> {profile?.email}</p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Rôle :</span>
            <Badge variant={profile?.platform_role === "super_admin" ? "default" : "secondary"}>
              {ROLE_LABELS[profile?.platform_role ?? "user"]}
            </Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Inscrit le :</span>{" "}
            {profile?.created_at && new Date(profile.created_at).toLocaleDateString("fr-CH")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" defaultValue={profile?.address ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tshirtSize">Taille de t-shirt</Label>
              <Select name="tshirtSize" defaultValue={profile?.tshirt_size ?? undefined}>
                <SelectTrigger id="tshirtSize">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {TSHIRT_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dateOfBirth">Date de naissance (optionnel)</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={profile?.date_of_birth ?? ""}
              />
            </div>
            <Button type="submit" size="sm" className="self-start">
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" /> Newsletter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="newsletterConsent"
                defaultChecked={profile?.newsletter_consent}
                className="mt-1"
              />
              <span>J&apos;accepte de recevoir des newsletters du groupement.</span>
            </label>
            <Button type="submit" size="sm">
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
