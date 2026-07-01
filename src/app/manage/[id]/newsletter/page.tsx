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
import { FlashToast } from "@/components/flash-toast"
import { requireManifestationAccess } from "@/lib/auth/guards"
import { sendNewsletter } from "./actions"

export default async function NewsletterPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { id } = await props.params
  const { supabase } = await requireManifestationAccess(id)
  const { error, message } = await props.searchParams

  const { data: sends } = await supabase
    .from("newsletter_sends")
    .select("subject, audience_scope, recipient_count, sent_at")
    .or(`manifestation_id.eq.${id},manifestation_id.is.null`)
    .order("sent_at", { ascending: false })

  const sendWithId = sendNewsletter.bind(null, id)

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <FlashToast error={error} message={message} />
      <Card>
        <CardHeader>
          <CardTitle>Envoyer une newsletter</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={sendWithId} className="flex flex-col gap-4">
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
            <Button type="submit">
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
                {sends?.map((s, i) => (
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
                {sends?.length === 0 && (
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
