import { useEffect, useState, useCallback, type FormEvent } from "react"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

type Entry = {
  id: string
  reason: string
  created_at: string
  manifestation_id: string
  profiles: { full_name: string | null; email: string } | null
  manifestations: { name: string } | null
  author: { full_name: string | null; email: string } | null
}

type ManageableManifestation = { id: string; name: string }

// Liste noire partagée entre organisateurs (décision Xavier 2026-07-03,
// déroge délibérément à l'isolation par manifestation habituelle -- voir
// doc/roadmap.md) -- signal visuel uniquement, aucun blocage automatique
// à l'inscription.
export default function BlacklistPage() {
  const { profile, isManifestationAdmin, loading } = useAuth()
  const isSuperAdmin = profile?.platform_role === "super_admin"
  const [entries, setEntries] = useState<Entry[]>([])
  const [manageable, setManageable] = useState<ManageableManifestation[]>([])
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(() => {
    const supabase = createClient()

    supabase
      .from("volunteer_blacklist")
      .select("id, reason, created_at, manifestation_id, profiles!volunteer_id(full_name, email), manifestations(name), author:profiles!created_by(full_name, email)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setEntries((data as unknown as Entry[]) ?? []))

    if (isSuperAdmin) {
      supabase
        .from("manifestations")
        .select("id, name")
        .order("name")
        .then(({ data }) => setManageable(data ?? []))
    } else {
      supabase
        .from("manifestation_admins")
        .select("manifestations(id, name)")
        .then(({ data }) =>
          setManageable(data?.map((row) => row.manifestations).filter((m) => m !== null) ?? []),
        )
    }
  }, [isSuperAdmin])

  useEffect(fetchData, [fetchData])

  if (!loading && !isManifestationAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    const email = formData.get("email") as string
    const manifestationId = formData.get("manifestationId") as string
    const reason = formData.get("reason") as string
    const supabase = createClient()

    setSubmitting(true)
    const { data: volunteer, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (lookupError || !volunteer) {
      setSubmitting(false)
      toast.error("Aucun bénévole trouvé avec cet email.")
      return
    }

    const { error } = await supabase.from("volunteer_blacklist").insert({
      volunteer_id: volunteer.id,
      manifestation_id: manifestationId,
      reason,
    })
    setSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    form.reset()
    toast.success("Ajouté à la liste noire.")
    fetchData()
  }

  async function deleteEntry(id: string) {
    const { error } = await createClient().from("volunteer_blacklist").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  const manageableIds = new Set(manageable.map((m) => m.id))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-destructive" />
        <h1 className="text-xl font-semibold">Liste noire</h1>
      </div>
      <p className="max-w-lg text-sm text-muted-foreground">
        Partagée entre tous les organisateurs du groupement — un signal, pas un blocage
        automatique. Chaque organisateur décide au cas par cas s&apos;il accepte une
        inscription.
      </p>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Ajouter un bénévole</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email du bénévole</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="manifestationId">Manifestation à l&apos;origine</Label>
              <Select name="manifestationId" required>
                <SelectTrigger id="manifestationId">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {manageable.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Motif / commentaire</Label>
              <Textarea id="reason" name="reason" required placeholder="Ex : absent sans prévenir le jour J" />
            </div>
            <Button type="submit" disabled={submitting} className="self-start">
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bénévole</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Signalé par</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  {entry.profiles?.full_name ?? entry.profiles?.email}
                </TableCell>
                <TableCell className="max-w-xs">{entry.reason}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {entry.manifestations?.name}
                  {entry.author && (
                    <span className="text-muted-foreground"> ({entry.author.full_name ?? entry.author.email})</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleDateString("fr-CH")}
                </TableCell>
                <TableCell>
                  {(isSuperAdmin || manageableIds.has(entry.manifestation_id)) && (
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun bénévole dans la liste noire.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
