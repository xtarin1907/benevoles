import { type FormEvent } from "react"
import { toast } from "sonner"
import { Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  user: "Bénévole",
}

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
