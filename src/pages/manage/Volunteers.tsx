import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"
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

type EngagementStatus = "interested" | "active" | "withdrawn"

type VolunteerRow = {
  id: string
  full_name: string | null
  email: string
  engagementStatus: EngagementStatus
  shiftCount: number
}

const STATUS_LABELS: Record<string, string> = {
  interested: "Intéressé(e)",
  active: "Actif",
  withdrawn: "Retiré(e)",
}

export default function ManageVolunteersPage() {
  const { id } = useParams<{ id: string }>()
  const [volunteers, setVolunteers] = useState<VolunteerRow[] | null>(null)
  const [blacklistedIds, setBlacklistedIds] = useState<Set<string>>(new Set())

  const fetchVolunteers = useCallback(() => {
    if (!id) return
    const supabase = createClient()

    Promise.all([
      supabase
        .from("manifestation_engagements")
        .select("status, volunteer_id, profiles(id, full_name, email)")
        .eq("manifestation_id", id),
      supabase
        .from("shift_signups")
        .select("volunteer_id, shifts!inner(manifestation_id)")
        .eq("shifts.manifestation_id", id),
    ]).then(([engagementsRes, signupsRes]) => {
      const shiftCounts = new Map<string, number>()
      for (const row of signupsRes.data ?? []) {
        shiftCounts.set(row.volunteer_id, (shiftCounts.get(row.volunteer_id) ?? 0) + 1)
      }

      const rows: VolunteerRow[] = (engagementsRes.data ?? [])
        .filter((e) => e.profiles)
        .map((e) => ({
          id: e.profiles!.id,
          full_name: e.profiles!.full_name,
          email: e.profiles!.email,
          engagementStatus: e.status,
          shiftCount: shiftCounts.get(e.volunteer_id) ?? 0,
        }))

      setVolunteers(rows)
    })

    supabase
      .from("volunteer_blacklist")
      .select("volunteer_id")
      .then(({ data }) => setBlacklistedIds(new Set(data?.map((b) => b.volunteer_id))))
  }, [id])

  useEffect(fetchVolunteers, [fetchVolunteers])

  async function handleBlacklistSubmit(e: FormEvent<HTMLFormElement>, volunteerId: string) {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)

    const { error } = await createClient().from("volunteer_blacklist").insert({
      volunteer_id: volunteerId,
      manifestation_id: id,
      reason: formData.get("reason") as string,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Ajouté à la liste noire.")
    fetchVolunteers()
  }

  if (!id) return null

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <ManageSubNav manifestationId={id} />
      <h1 className="text-xl font-semibold">Bénévoles</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="text-right">Shifts</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {volunteers?.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    {v.full_name ?? "—"}
                    {blacklistedIds.has(v.id) && (
                      <AlertTriangle className="size-3.5 text-destructive" aria-label="Bénévole dans la liste noire" />
                    )}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{v.email}</TableCell>
                <TableCell>
                  <Badge variant={v.engagementStatus === "withdrawn" ? "secondary" : "default"}>
                    {STATUS_LABELS[v.engagementStatus] ?? v.engagementStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{v.shiftCount}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <ShieldAlert />
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={(e) => handleBlacklistSubmit(e, v.id)}>
                        <DialogHeader>
                          <DialogTitle>Blacklister {v.full_name ?? v.email}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-2 py-2">
                          <Label htmlFor={`reason-${v.id}`}>Motif / commentaire</Label>
                          <Textarea id={`reason-${v.id}`} name="reason" required />
                        </div>
                        <DialogFooter>
                          <DialogClose render={<Button type="button" variant="outline" />}>Annuler</DialogClose>
                          <DialogClose render={<Button type="submit" variant="destructive" />}>
                            Blacklister
                          </DialogClose>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {volunteers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Aucun bénévole engagé pour l&apos;instant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
