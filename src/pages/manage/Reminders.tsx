import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { Send, Trash2 } from "lucide-react"
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
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Settings = Database["public"]["Tables"]["manifestation_reminder_settings"]["Row"]
type Rule = Database["public"]["Tables"]["reminder_rules"]["Row"]
type SendMode = Database["public"]["Enums"]["reminder_send_mode"]

function formatOffset(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} jour(s) avant`
  if (minutes % 60 === 0) return `${minutes / 60} heure(s) avant`
  return `${minutes} minute(s) avant`
}

export default function RemindersPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isSuperAdmin = profile?.platform_role === "super_admin"
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined)
  const [rules, setRules] = useState<Rule[]>([])
  const [sending, setSending] = useState(false)

  const fetchData = useCallback(() => {
    if (!id) return
    const supabase = createClient()
    supabase
      .from("manifestation_reminder_settings")
      .select("*")
      .eq("manifestation_id", id)
      .maybeSingle()
      .then(({ data }) => setSettings(data))
    supabase
      .from("reminder_rules")
      .select("*")
      .eq("manifestation_id", id)
      .order("offset_minutes", { ascending: false })
      .then(({ data }) => setRules(data ?? []))
  }, [id])

  useEffect(fetchData, [fetchData])

  async function enableReminders() {
    if (!id) return
    const { error } = await createClient()
      .from("manifestation_reminder_settings")
      .insert({ manifestation_id: id })
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  async function updateSendMode(send_mode: SendMode) {
    if (!id) return
    const { error } = await createClient()
      .from("manifestation_reminder_settings")
      .update({ send_mode })
      .eq("manifestation_id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  async function toggleSmsEnabled(sms_enabled: boolean) {
    if (!id) return
    const { error } = await createClient()
      .from("manifestation_reminder_settings")
      .update({ sms_enabled })
      .eq("manifestation_id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  async function handleAddRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget

    const { error } = await createClient().from("reminder_rules").insert({
      manifestation_id: id,
      offset_minutes: Number(formData.get("offsetMinutes")),
      message_template: formData.get("messageTemplate") as string,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    form.reset()
    fetchData()
  }

  async function deleteRule(ruleId: string) {
    const { error } = await createClient().from("reminder_rules").delete().eq("id", ruleId)
    if (error) {
      toast.error(error.message)
      return
    }
    fetchData()
  }

  async function sendNow() {
    setSending(true)
    const { data, error } = await createClient().functions.invoke("send-reminders", {
      body: { manifestationId: id },
    })
    setSending(false)
    if (error || data?.error) {
      toast.error(data?.error ?? error.message)
      return
    }
    toast.success(`${data.sent} rappel(s) envoyé(s).`)
  }

  if (!id || settings === undefined) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />

      {!settings ? (
        <Card>
          <CardHeader>
            <CardTitle>Rappels SMS</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Envoie des rappels SMS automatiques à tes bénévoles avant leur shift. Fonctionnalité
              payante — le déclenchement effectif des envois reste soumis à l&apos;activation par
              le groupement.
            </p>
            <Button type="button" className="self-start" onClick={enableReminders}>
              Configurer les rappels
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Envoi des SMS</span>
                <Badge variant={settings.sms_enabled ? "default" : "secondary"}>
                  {settings.sms_enabled ? "Activé" : "Désactivé"}
                </Badge>
              </div>
              {isSuperAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => toggleSmsEnabled(!settings.sms_enabled)}
                >
                  {settings.sms_enabled ? "Désactiver" : "Activer"} pour cette manifestation
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Seul le groupement peut activer l&apos;envoi effectif des SMS (fonctionnalité
                  payante).
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="sendMode">Mode d&apos;envoi</Label>
                <Select value={settings.send_mode} onValueChange={(v) => v && updateSendMode(v as SendMode)}>
                  <SelectTrigger id="sendMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatique</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {settings.send_mode === "manual" && (
                <Button type="button" size="sm" className="self-start" disabled={sending} onClick={sendNow}>
                  <Send /> Envoyer maintenant
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Règles de rappel</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{formatOffset(rule.offset_minutes)}</p>
                      <p className="text-sm text-muted-foreground">{rule.message_template}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => deleteRule(rule.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {rules.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune règle configurée.</p>
                )}
              </div>
              <form onSubmit={handleAddRule} className="flex flex-col gap-4 border-t pt-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="offsetMinutes">Minutes avant le shift</Label>
                  <Input id="offsetMinutes" name="offsetMinutes" type="number" min="1" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="messageTemplate">Message</Label>
                  <Textarea id="messageTemplate" name="messageTemplate" rows={3} required />
                </div>
                <Button type="submit" size="sm" className="self-start">
                  Ajouter une règle
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
