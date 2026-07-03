import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { Send } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ManageSubNav } from "@/components/manage/manage-sub-nav"
import { createClient } from "@/lib/supabase/client"

type NewsletterSend = {
  subject: string
  audience_scope: string
  recipient_count: number | null
  sent_at: string
}

export default function NewsletterPage() {
  const { id } = useParams<{ id: string }>()
  const [sends, setSends] = useState<NewsletterSend[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editionYear, setEditionYear] = useState<number | null>(null)

  const fetchSends = useCallback(() => {
    if (!id) return
    createClient()
      .from("newsletter_sends")
      .select("subject, audience_scope, recipient_count, sent_at")
      .or(`manifestation_id.eq.${id},manifestation_id.is.null`)
      .order("sent_at", { ascending: false })
      .then(({ data }) => setSends(data ?? []))
  }, [id])

  useEffect(fetchSends, [fetchSends])

  useEffect(() => {
    if (!id) return
    createClient()
      .from("manifestations")
      .select("series_id, edition_year")
      .eq("id", id)
      .single()
      .then(({ data }) => setEditionYear(data?.series_id ? data.edition_year : null))
  }, [id])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    setSubmitting(true)
    const { data, error } = await createClient().functions.invoke("send-newsletter", {
      body: {
        manifestationId: id,
        subject: formData.get("subject"),
        body: formData.get("body"),
        scope: formData.get("scope"),
      },
    })
    setSubmitting(false)

    if (error || data?.error) {
      toast.error(data?.error ?? error.message)
      return
    }

    toast.success(`Envoyé à ${data.recipientCount} bénévole(s).`)
    form.reset()
    fetchSends()
  }

  if (!id) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />
      {editionYear && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Cette newsletter cible uniquement l&apos;édition {editionYear} — les autres éditions
          de cette série ont leurs propres bénévoles engagés et ne recevront pas cet envoi.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Envoyer une newsletter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="scope">Destinataires</Label>
              <Select name="scope" defaultValue="manifestation_engaged">
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manifestation_engaged">
                    Bénévoles engagés sur cette manifestation
                  </SelectItem>
                  <SelectItem value="all_platform">
                    Tous les bénévoles de la plateforme
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Seuls les bénévoles ayant explicitement accepté de recevoir des newsletters
                reçoivent l&apos;email, quel que soit le choix ci-dessus.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subject">Sujet</Label>
              <Input id="subject" name="subject" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" name="body" rows={6} required />
            </div>
            <Button type="submit" disabled={submitting}>
              <Send /> Envoyer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Portée</TableHead>
                  <TableHead>Destinataires</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sends.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{s.subject}</TableCell>
                    <TableCell>
                      <Badge variant={s.audience_scope === "all_platform" ? "default" : "secondary"}>
                        {s.audience_scope === "all_platform" ? "Plateforme entière" : "Cette manifestation"}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.recipient_count}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(s.sent_at).toLocaleString("fr-CH")}
                    </TableCell>
                  </TableRow>
                ))}
                {sends.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucun envoi pour l&apos;instant.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
