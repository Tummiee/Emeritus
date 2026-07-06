import { CustomerEditor } from "@/components/admin/CustomerEditor"
import { createClient } from "@/lib/supabase/server"

export default async function CustomersPage() {
  const supabase = await createClient()
  const [{ data: profiles }, { data: orders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,first_name,last_name,phone")
      .eq("role", "customer")
      .order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id,total,status"),
  ])
  const totals = new Map<string, { orders: number; spent: number }>()
  orders?.forEach((order) => {
    const current = totals.get(order.user_id) ?? { orders: 0, spent: 0 }
    current.orders++
    if (!["cancelled", "refunded"].includes(order.status)) {
      current.spent += Number(order.total)
    }
    totals.set(order.user_id, current)
  })

  return (
    <main className="p-5 lg:p-8">
      <h1 className="text-3xl font-bold">Customers</h1>
      <p className="mt-2 text-slate-500">Customer profiles and lifetime value.</p>
      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {profiles?.map((profile) => {
          const total = totals.get(profile.id) ?? { orders: 0, spent: 0 }
          return (
            <CustomerEditor
              key={profile.id}
              profile={profile}
              orders={total.orders}
              spent={new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(total.spent)}
            />
          )
        })}
      </div>
    </main>
  )
}
