import Link from "next/link"
import { RotateCcw, UserMinus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FlashToast } from "@/components/flash-toast"
import { createClient } from "@/lib/supabase/server"
import { setEngagementStatus } from "./actions"

const STATUS_LABELS: Record<string, string> = {
  interested: "Intéressé(e)",
  active: "Actif",
  withdrawn: "Retiré(e)",
}

export default async function EngagementsPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: engagements } = await supabase
    .from("manifestation_engagements")
    .select("status, manifestations(id, name)")
    .eq("volunteer_id", user!.id)

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <FlashToast error={error} />
      <h1 className="text-xl font-semibold">Mes engagements</h1>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manifestation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {engagements?.map((e) => {
              if (!e.manifestations) return null
              const withdrawWithId = setEngagementStatus.bind(null, e.manifestations.id, "withdrawn")
              const reactivateWithId = setEngagementStatus.bind(null, e.manifestations.id, "interested")

              return (
                <TableRow key={e.manifestations.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link href={`/manifestations/${e.manifestations.id}`} className="hover:underline">
                      {e.manifestations.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.status === "withdrawn" ? "secondary" : "default"}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === "withdrawn" ? (
                      <form action={reactivateWithId}>
                        <Button type="submit" variant="ghost" size="sm">
                          <RotateCcw /> Réactiver
                        </Button>
                      </form>
                    ) : (
                      <form action={withdrawWithId}>
                        <Button type="submit" variant="ghost" size="sm">
                          <UserMinus /> Me retirer
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {engagements?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Aucun engagement pour l&apos;instant.{" "}
                  <Link href="/" className="underline">Voir les manifestations</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
