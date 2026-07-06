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
  return <div><h1 className="text-3xl font-bold">Repair bookings</h1><p className="mb-8 mt-2 text-muted-foreground">Book service and follow repair progress.</p><div className="mb-6 space-y-3">{data?.map((repair) => <article key={repair.id} className="rounded-xl border border-border p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{repair.brand} {repair.device}</p><p className="text-xs text-muted-foreground">{repair.booking_date} at {String(repair.booking_time).slice(0, 5)}</p></div><span className="h-fit rounded-full bg-muted px-3 py-1 text-xs capitalize">{repair.status.replace("_", " ")}</span></div><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{repair.issue}</p>{repair.status_note && <p className="mt-3 rounded-lg bg-muted p-3 text-sm">{repair.status_note}</p>}<p className="mt-2 text-xs text-muted-foreground">Request {repair.reference}</p></article>)}</div><RepairForm devices={devices?.map((item) => item.name) ?? []} brands={brands?.map((item) => item.name) ?? []} minimumDate={minimumDate} /></div>
}
