import { useEffect, useState, useCallback, type FormEvent } from "react"
import { toast } from "sonner"
import { Building2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(() => {
    createClient()
      .from("partners")
      .select("*")
      .order("order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => setPartners(data ?? []))
  }, [])

  useEffect(fetchData, [fetchData])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    const supabase = createClient()

    let logoUrl: string | null = null
    if (logoFile) {
      setSubmitting(true)
      const ext = logoFile.name.split(".").pop()
      const path = `logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("partner-logos").upload(path, logoFile)
      if (uploadError) {
        setSubmitting(false)
        toast.error(uploadError.message)
        return
      }
      logoUrl = supabase.storage.from("partner-logos").getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from("partners").insert({
      name: formData.get("name") as string,
      logo_url: logoUrl,
      website_url: (formData.get("websiteUrl") as string) || null,
      order: formData.get("order") ? Number(formData.get("order")) : 0,
    })
    setSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    form.reset()
    setLogoFile(null)
    toast.success("Partenaire ajouté.")
    fetchData()
  }

  async function deletePartner(id: string) {
    const { error } = await createClient().from("partners").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Nos partenaires</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Ajouter un partenaire</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="logoFile">Logo</Label>
              <Input
                id="logoFile"
                name="logoFile"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="websiteUrl">Site web (optionnel)</Label>
              <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://..." />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="order">Ordre d&apos;affichage</Label>
              <Input id="order" name="order" type="number" defaultValue={0} />
            </div>
            <Button type="submit" disabled={submitting} className="self-start">
              {submitting ? "Envoi..." : "Ajouter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Site web</TableHead>
              <TableHead>Ordre</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex size-10 items-center justify-center rounded border bg-white p-1">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Building2 className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                <TableCell className="whitespace-nowrap">{p.website_url ?? "—"}</TableCell>
                <TableCell>{p.order}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => deletePartner(p.id)}>
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {partners.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun partenaire pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
