"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "@/lib/auth/actions"
import {
  BadgePercent, BarChart3, Boxes, Building2, CircleDollarSign, Clapperboard,
  FolderOpen, ImageIcon, LayoutDashboard, LogOut, MessageSquareText, Package, ReceiptText,
  Settings, ShoppingCart, Tags, TicketPercent, Truck, Users, Wrench,
} from "lucide-react"

const navigation = [
  ["Overview", [["/admin", "Dashboard", LayoutDashboard], ["/admin/analytics", "Analytics", BarChart3], ["/admin/revenue", "Revenue", CircleDollarSign]]],
  ["Commerce", [["/admin/orders", "Orders", ShoppingCart], ["/admin/customers", "Customers", Users], ["/admin/products", "Products", Package], ["/admin/offers", "Offers", BadgePercent], ["/admin/inventory", "Inventory", Boxes], ["/admin/categories", "Categories", Tags], ["/admin/brands", "Brands", Building2], ["/admin/coupons", "Coupons", TicketPercent], ["/admin/reviews", "Reviews", MessageSquareText]]],
  ["Content", [["/admin/media", "Media library", ImageIcon], ["/admin/hero", "Hero manager", Clapperboard], ["/admin/homepage", "Homepage manager", FolderOpen]]],
  ["Operations", [["/admin/repairs", "Repair bookings", Wrench], ["/admin/reports", "Reports", ReceiptText], ["/admin/shipping", "Shipping", Truck], ["/admin/tax", "Tax", BadgePercent], ["/admin/settings", "Settings", Settings]]],
] as const

export default function AdminSidebar() {
  const path = usePathname()
  return <aside className="sticky top-0 z-40 flex w-full shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 lg:h-screen lg:w-64">
    <Link href="/admin" className="hidden h-18 items-center gap-3 border-b border-slate-800 px-5 lg:flex"><Image src="/logo.svg" alt="Emeritus Logo" width={36} height={36} className="rounded-xl" /><span><span className="block text-sm font-semibold">Emeritus Admin</span><span className="block text-xs text-slate-400">Commerce control</span></span></Link>
    <nav className="flex flex-1 gap-1 overflow-x-auto p-2 lg:block lg:overflow-y-auto lg:p-3">
      {navigation.map(([group, links]) => <div key={group} className="contents lg:mb-5 lg:block"><p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:block">{group}</p><div className="contents lg:block lg:space-y-1">{links.map(([href, label, Icon]) => {
        const active = path === href || (href !== "/admin" && path.startsWith(`${href}/`))
        return <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs transition lg:gap-3 lg:py-2.5 lg:text-sm ${active ? "bg-primary text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}><Icon className="size-4" />{label}</Link>
      })}</div></div>)}
      <form
        action={signOut}
        className="shrink-0 lg:mt-1 lg:border-t lg:border-slate-800 lg:pt-3"
        onSubmit={() => {
          localStorage.removeItem("emeritus-cart:guest")
          localStorage.removeItem("emeritus-coupon:guest")
          localStorage.removeItem("cart")
          localStorage.removeItem("coupon")
          localStorage.removeItem("wishlist")
          window.dispatchEvent(new Event("emeritus:signout"))
        }}
      >
        <button className="flex w-full shrink-0 items-center gap-2 rounded-xl border border-red-900/70 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 transition hover:border-red-800 hover:bg-red-950/70 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-800 lg:gap-3 lg:py-2.5 lg:text-sm">
          <LogOut className="size-4" />
          Log out
        </button>
      </form>
    </nav>
  </aside>
}
