import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import type { Database } from "@/lib/supabase/database.types"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

export default function PartnersPage() {
  const { user } = useAuth()
  const [partners, setPartners] = useState<Partner[] | null>(null)

  useEffect(() => {
    createClient()
      .from("partners")
      .select("*")
      .eq("is_visible", true)
      .order("order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => setPartners(data ?? []))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []} userEmail={user?.email} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 sm:py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Nos partenaires</h1>
          <p className="text-muted-foreground">
            Ils soutiennent le groupement et ses manifestations bénévoles.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {partners?.map((partner) => {
            const card = (
              <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex size-24 items-center justify-center rounded-lg border bg-white p-2">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={partner.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold">{partner.name}</h3>
                </CardContent>
              </Card>
            )

            return partner.website_url ? (
              <a key={partner.id} href={partner.website_url} target="_blank" rel="noopener noreferrer">
                {card}
              </a>
            ) : (
              <div key={partner.id}>{card}</div>
            )
          })}
          {partners?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">
              Aucun partenaire pour l&apos;instant.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
