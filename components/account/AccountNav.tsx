"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Heart, House, MapPin, Package, ShieldCheck, UserRound, Wrench } from "lucide-react"

const links = [
  ["/account", "Overview", House],
  ["/account/profile", "Profile", UserRound],
  ["/account/orders", "Orders", Package],
  ["/account/wishlist", "Wishlist", Heart],
  ["/account/addresses", "Addresses", MapPin],
  ["/account/repairs", "Repairs", Wrench],
  ["/account/notifications", "Notifications", Bell],
  ["/account/security", "Security", ShieldCheck],
] as const

export function AccountNav() {
  const path = usePathname()
  return (
    <nav className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden" aria-label="Account">
      {links.map(([href, label, Icon]) => {
        const active = path === href
        return <Link key={href} href={href} className={`flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-sm font-medium transition lg:gap-3 lg:border-transparent ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground lg:bg-transparent"}`}><Icon className="size-4" />{label}</Link>
      })}
    </nav>
  )
}
