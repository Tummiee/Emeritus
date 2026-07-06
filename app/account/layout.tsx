import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { AccountNav } from "@/components/account/AccountNav"
import { SignOutButton } from "@/components/account/SignOutButton"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle()
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto grid w-full min-w-0 max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8">
        <aside className="min-w-0 space-y-3 lg:space-y-5">
          <div className="flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 lg:block lg:border-0 lg:bg-transparent lg:px-2 lg:py-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="shrink-0 lg:mt-4">
              <SignOutButton />
            </div>
          </div>
          <AccountNav />
        </aside>
        <section className="w-full min-w-0">{children}</section>
      </main>
      <Footer />
    </div>
  )
}
