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
import { createManifestation } from "../actions"

export default async function NewManifestationPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  await requireSuperAdmin()
  const { error } = await props.searchParams

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nouvelle manifestation</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createManifestation} className="flex flex-col gap-4">
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
            <Input id="colorHex" name="colorHex" type="color" defaultValue="#6366f1" />
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit">Créer</Button>
        </form>
      </CardContent>
    </Card>
  )
}
