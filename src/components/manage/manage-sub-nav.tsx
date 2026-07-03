import { Link, useLocation } from "react-router-dom"
import { Bell, ChevronLeft, ChevronRight, LayoutGrid, Mail, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

function steps(manifestationId: string) {
  return [
    { href: `/manage/${manifestationId}`, label: "Branding", icon: LayoutGrid },
    { href: `/manage/${manifestationId}/secteurs`, label: "Secteurs" },
    { href: `/manage/${manifestationId}/shifts`, label: "Shifts" },
    { href: `/manage/${manifestationId}/volunteers`, label: "Bénévoles", icon: Users },
    { href: `/manage/${manifestationId}/newsletter`, label: "Newsletter", icon: Mail },
    { href: `/manage/${manifestationId}/reminders`, label: "Rappels", icon: Bell },
  ]
}

export function ManageSubNav({ manifestationId }: { manifestationId: string }) {
  const { pathname } = useLocation()
  const items = steps(manifestationId)
  // Longest-prefix match so "/manage/:id/shifts/:shiftId" still highlights "Shifts".
  const activeIndex = items.reduce(
    (best, step, i) =>
      pathname === step.href || pathname.startsWith(`${step.href}/`)
        ? (items[best]?.href.length ?? -1) < step.href.length
          ? i
          : best
        : best,
    -1,
  )

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex gap-2 overflow-x-auto text-sm">
        {items.map((step, i) =>
          i === activeIndex ? (
            <Button key={step.href} variant="secondary" size="sm" disabled className="shrink-0">
              {step.icon && <step.icon />} {step.label}
            </Button>
          ) : (
            <Button
              key={step.href}
              variant="ghost"
              size="sm"
              render={<Link to={step.href} />}
              className="shrink-0"
            >
              {step.icon && <step.icon />} {step.label}
            </Button>
          ),
        )}
      </nav>
      {activeIndex >= 0 && (
        <div className="flex items-center justify-between text-sm">
          {activeIndex > 0 ? (
            <Button variant="ghost" size="sm" render={<Link to={items[activeIndex - 1].href} />}>
              <ChevronLeft /> {items[activeIndex - 1].label}
            </Button>
          ) : (
            <span />
          )}
          {activeIndex < items.length - 1 ? (
            <Button variant="ghost" size="sm" render={<Link to={items[activeIndex + 1].href} />}>
              Suivant : {items[activeIndex + 1].label} <ChevronRight />
            </Button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  )
}
