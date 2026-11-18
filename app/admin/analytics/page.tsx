import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const end = new Date(`${today}T00:00:00+01:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end.getTime() - 30 * 86400000);
  const [{ count: completed }, { count: customers }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered")
      .gte("created_at", start.toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .gte("created_at", start.toISOString()),
  ]);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  });
  const { data: summary, error } = await supabase.rpc(
    "admin_financial_summary",
    { p_from: start.toISOString(), p_to: end.toISOString() },
  );
  if (error) throw new Error("Analytics could not be loaded");
  const sales = new Map<string, number>(days.map((day) => [day, 0]));
  for (const day of summary.daily) sales.set(day.date, Number(day.amount));
  const max = Math.max(...sales.values(), 1);
  const revenue = Number(summary.collected);
  const metrics = [
    [
      "30-day revenue",
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(revenue),
    ],
    ["Orders", Number(summary.orders)],
    ["New customers", customers ?? 0],
    ["Fulfilled", completed],
  ];
  return (
    <main className="p-5 lg:p-8">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <p className="mt-2 text-slate-500">
        Live performance over the last 30 days.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <section className="mt-6 rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">Daily revenue</h2>
        <div className="mt-6 flex h-64 items-end gap-1">
          {days.map((day) => (
            <div
              key={day}
              title={`${day}: ${sales.get(day)}`}
              className="min-w-0 flex-1 rounded-t bg-primary/80"
              style={{
                height: `${Math.max(((sales.get(day) ?? 0) / max) * 100, 1)}%`,
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>{days[0]}</span>
          <span>{days.at(-1)}</span>
        </div>
      </section>
    </main>
  );
}
