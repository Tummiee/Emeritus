import { RepairForm } from "@/components/account/AccountForms"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function RepairsPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const [{ data }, { data: devices }, { data: brands }] = await Promise.all([
    supabase.from("repair_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("repair_device_types").select("name").eq("active", true).order("display_order"),
    supabase.from("repair_brands").select("name").eq("active", true).order("display_order"),
  ])
  const minimumDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  return <div className="min-w-0"><h1 className="text-2xl font-bold sm:text-3xl">Repair bookings</h1><p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">Book service and follow repair progress.</p><div className="mb-6 space-y-3">{data?.map((repair) => <article key={repair.id} className="min-w-0 rounded-xl border border-border p-4"><div className="flex flex-col items-start gap-2 min-[420px]:flex-row min-[420px]:justify-between"><div className="min-w-0"><p className="break-words font-semibold">{repair.brand} {repair.device}</p><p className="text-xs text-muted-foreground">{repair.booking_date} at {String(repair.booking_time).slice(0, 5)}</p></div><span className="h-fit shrink-0 rounded-full bg-muted px-3 py-1 text-xs capitalize">{repair.status.replace("_", " ")}</span></div><p className="mt-3 line-clamp-2 break-words text-sm text-muted-foreground">{repair.issue}</p>{repair.status_note && <p className="mt-3 break-words rounded-lg bg-muted p-3 text-sm">{repair.status_note}</p>}<p className="mt-2 truncate text-xs text-muted-foreground">Request {repair.reference}</p></article>)}</div><RepairForm devices={devices?.map((item) => item.name) ?? []} brands={brands?.map((item) => item.name) ?? []} minimumDate={minimumDate} /></div>
}
