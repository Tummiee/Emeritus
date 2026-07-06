import { createClient } from "@/lib/supabase/server"

export default async function RevenuePage() {
  const supabase=await createClient()
  const {data}=await supabase.from("orders").select("id,order_number,total,discount,shipping,currency,status,created_at").order("created_at",{ascending:false}).limit(1000)
  const valid=data?.filter(o=>!["cancelled","refunded"].includes(o.status))??[]
  const gross=valid.reduce((s,o)=>s+Number(o.total),0), discounts=valid.reduce((s,o)=>s+Number(o.discount),0), shipping=valid.reduce((s,o)=>s+Number(o.shipping),0)
  const money=(n:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN"}).format(n)
  return <main className="p-5 lg:p-8"><h1 className="text-3xl font-bold">Revenue</h1><p className="mt-2 text-slate-500">Financial totals calculated from live orders.</p><div className="mt-7 grid gap-4 md:grid-cols-3">{[["Net collected",money(gross)],["Discounts",money(discounts)],["Shipping",money(shipping)]].map(([a,b])=><div className="rounded-2xl border bg-white p-5" key={a}><p className="text-sm text-slate-500">{a}</p><p className="mt-2 text-2xl font-bold">{b}</p></div>)}</div><div className="mt-6 overflow-hidden rounded-2xl border bg-white">{data?.map(o=><div key={o.id} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b p-4 text-sm"><div><strong>{o.order_number}</strong><p className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString()}</p></div><span className="capitalize text-slate-500">{o.status}</span><strong>{money(Number(o.total))}</strong></div>)}</div></main>
}
