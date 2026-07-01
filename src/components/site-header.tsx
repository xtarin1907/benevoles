"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  const pathname = usePathname()

  const linkClass = (href: string) =>
    cn(
      "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
      pathname === href ? "bg-muted text-foreground" : "text-muted-foreground",
    )

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold">
          <HeartHandshake className="size-5 text-primary" />
          Bénévoles+
        </Link>
        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
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
              <form action={signOut} className="contents">
                <DropdownMenuItem
                  variant="destructive"
                  render={<button type="submit" className="w-full" />}
                >
                  <LogOut /> Se déconnecter
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 sm:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
