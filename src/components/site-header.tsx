import { Link, useLocation, useNavigate } from "react-router-dom"
import { HeartHandshake, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/auth/actions"

export type NavItem = { href: string; label: string }

export function SiteHeader({
  navItems,
  userEmail,
}: {
  navItems: NavItem[]
  userEmail?: string
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const linkClass = (href: string) =>
    cn(
      "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
      pathname === href ? "bg-muted text-foreground" : "text-muted-foreground",
    )

  async function handleSignOut() {
    await signOut()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link to="/" className="group flex shrink-0 items-center gap-2 text-lg font-semibold">
          <HeartHandshake className="size-5 text-primary transition-transform group-hover:scale-105 group-hover:rotate-3" />
          Bénévoles+
        </Link>
        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        {userEmail && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="rounded-full" />}>
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                  {userEmail.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="max-w-48 truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                render={<button type="button" className="w-full" onClick={handleSignOut} />}
              >
                <LogOut /> Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 sm:hidden">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
