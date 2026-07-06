import { createClient } from "@/lib/supabase/server"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const start = new Date(); start.setUTCDate(start.getUTCDate()-29)
  const [{data:orders},{data:customers}] = await Promise.all([supabase.from("orders").select("total,status,created_at").gte("created_at",start.toISOString()),supabase.from("profiles").select("created_at").eq("role","customer").gte("created_at",start.toISOString())])
  const days = Array.from({length:30},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)})
  const sales = new Map(days.map(day=>[day,0]))
  orders?.filter(o=>!["cancelled","refunded"].includes(o.status)).forEach(o=>sales.set(o.created_at.slice(0,10),(sales.get(o.created_at.slice(0,10))??0)+Number(o.total)))
  const max=Math.max(...sales.values(),1); const revenue=[...sales.values()].reduce((a,b)=>a+b,0); const completed=orders?.filter(o=>o.status==="delivered").length??0
  const metrics=[["30-day revenue",new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(revenue)],["Orders",orders?.length??0],["New customers",customers?.length??0],["Fulfilled",completed]]
  return <main className="p-5 lg:p-8"><h1 className="text-3xl font-bold">Analytics</h1><p className="mt-2 text-slate-500">Live performance over the last 30 days.</p><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value])=><div key={label} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div><section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Daily revenue</h2><div className="mt-6 flex h-64 items-end gap-1">{days.map(day=><div key={day} title={`${day}: ${sales.get(day)}`} className="min-w-0 flex-1 rounded-t bg-primary/80" style={{height:`${Math.max(((sales.get(day)??0)/max)*100,1)}%`}} />)}</div><div className="mt-2 flex justify-between text-xs text-slate-400"><span>{days[0]}</span><span>{days.at(-1)}</span></div></section></main>
}
