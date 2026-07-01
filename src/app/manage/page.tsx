import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ManagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single()

  const manifestations =
    profile?.platform_role === "super_admin"
      ? (await supabase.from("manifestations").select("*").order("created_at", { ascending: false }))
          .data
      : (
          await supabase
            .from("manifestation_admins")
            .select("manifestations(*)")
            .eq("user_id", user.id)
        ).data?.map((row) => row.manifestations).filter((m) => m !== null)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Mes manifestations</h1>
      <ul className="flex flex-col gap-2">
        {manifestations?.map((m) => (
          <li key={m.id}>
            <Link href={`/manage/${m.id}`} className="underline">
              {m.name}
            </Link>
          </li>
        ))}
        {(!manifestations || manifestations.length === 0) && (
          <li className="text-muted-foreground">
            Tu n&apos;administres aucune manifestation pour l&apos;instant.
          </li>
        )}
      </ul>
    </div>
  )
}
