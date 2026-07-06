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
    <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Account">
      {links.map(([href, label, Icon]) => {
        const active = path === href
        return <Link key={href} href={href} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" />{label}</Link>
      })}
    </nav>
  )
}
