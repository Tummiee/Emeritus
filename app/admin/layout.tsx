import { requireAdmin } from "@/lib/auth/session"
import AdminSidebar from "@/components/admin/AdminSidebar"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  return <div className="min-h-screen bg-slate-50 text-slate-950"><div className="flex flex-col lg:flex-row"><AdminSidebar /><div className="min-w-0 flex-1"><header className="sticky top-12 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:top-0 lg:h-18 lg:px-8"><div><p className="text-sm font-semibold">Admin workspace</p><p className="text-xs text-slate-500">Live Supabase data</p></div><Link href="/" target="_blank" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium">View store <ExternalLink className="size-3.5" /></Link></header>{children}</div></div></div>
}
