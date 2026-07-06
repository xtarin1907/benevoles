import { Link } from "react-router-dom"
import { ArrowRight, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"

// Placeholder social URLs -- to fill once the groupement's real accounts are
// known. Kept here (not hard-coded in JSX) so they are trivial to update.
const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
]

const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Manifestations", to: "/" },
  { label: "Nos partenaires", to: "/partenaires" },
  { label: "Organisateurs", to: "/organisateurs" },
]

const LEGAL_LINKS: { label: string; to: string }[] = [
  { label: "Mentions légales", to: "/mentions-legales" },
  { label: "Confidentialité", to: "/confidentialite" },
  { label: "CGU", to: "/cgu" },
]

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-4">
        {/* Marque + mission */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BrandLogo className="size-6" />
            Bénévoles Lavaux
          </div>
          <p className="text-sm text-muted-foreground">
            La plateforme bénévole du groupement d&apos;associations de Lavaux :
            engage-toi, cumule des points, fais vivre les manifestations.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Naviguer</p>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            {NAV_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Légal */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Légal</p>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            {LEGAL_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Newsletter + réseaux */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Reste informé(e)</p>
          <p className="text-sm text-muted-foreground">
            Crée ton compte bénévole et coche l&apos;option newsletter pour
            recevoir les actualités du groupement.
          </p>
          <Button size="sm" className="w-fit" render={<Link to="/signup" />}>
            <Mail className="size-4" /> S&apos;inscrire <ArrowRight className="size-4" />
          </Button>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Bénévoles Lavaux — groupement d&apos;associations de Lavaux.
      </div>
    </footer>
  )
}
