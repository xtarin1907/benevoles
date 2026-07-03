import { Link } from "react-router-dom"
import { CalendarClock, Megaphone, Users2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { useAuth } from "@/contexts/AuthContext"

const STEPS = [
  {
    icon: Users2,
    title: "Crée ta manifestation",
    text: "Décris ton événement, choisis tes couleurs, configure tes secteurs et tes shifts.",
  },
  {
    icon: Megaphone,
    title: "Validation par le groupement",
    text: "Une fois créée, ta manifestation est vérifiée avant d'être visible sur la landing bénévoles.",
  },
  {
    icon: CalendarClock,
    title: "Recrute tes bénévoles",
    text: "Les bénévoles du groupement s'inscrivent directement sur tes shifts, cumulent des points.",
  },
]

export default function OrganizersPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <SiteHeader navItems={user ? [{ href: "/manage", label: "Gérer" }] : []} userEmail={user?.email} />
      <section className="border-b bg-linear-to-b from-background to-muted/40 px-4 py-12 text-center sm:py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Tu organises une <span className="text-gradient">manifestation</span> ?
          </h1>
          <p className="text-lg text-muted-foreground">
            Rejoins le groupement et recrute tes bénévoles parmi une communauté déjà engagée.
          </p>
          <Button size="lg" render={<Link to={user ? "/manage/new" : "/signup?next=/manage/new"} />}>
            Créer ma manifestation
          </Button>
        </div>
      </section>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Tu es plutôt bénévole ?{" "}
          <Link to="/" className="underline underline-offset-2">
            Retour à la page d&apos;accueil
          </Link>
        </p>
      </main>
    </div>
  )
}
