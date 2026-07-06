import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useAuth } from "@/contexts/AuthContext"

// Shared shell for the legal stub pages (mentions légales / confidentialité /
// CGU). Content is intentionally a placeholder until the real legal text is
// provided (cf. non-négociable consentement/nLPD -- à valider avant prod).
export function LegalPage({ title }: { title: string }) {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        navItems={user ? [{ href: "/dashboard", label: "Mon espace" }] : []}
        userEmail={user?.email}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-muted-foreground">
          Contenu à compléter. Cette page est un gabarit en attente du texte
          définitif.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
