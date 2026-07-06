import { ShippingZoneForm, type ShippingZoneEditorData } from "@/components/admin/ShippingZoneForm"
import { createClient } from "@/lib/supabase/server"

type ShippingZoneRow = Omit<ShippingZoneEditorData, "states"> & {
  shipping_zone_states: Array<{ state_name: string }> | null
}

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("id,name,base_fee,free_shipping_threshold,estimated_days_min,estimated_days_max,is_fallback,active,shipping_zone_states(state_name)")
    .order("is_fallback")
    .order("name")
  const zones = (data ?? []) as ShippingZoneRow[]

  return (
    <main className="p-5 lg:p-8">
      <h1 className="text-3xl font-bold">Shipping</h1>
      <p className="mt-2 max-w-3xl text-slate-500">
        Configure delivery zones, fees, free-shipping thresholds, and delivery estimates.
      </p>

      {params.saved && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Shipping zone saved.</p>}
      {params.deleted && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Shipping zone deleted.</p>}
      {(params.error || error) && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Could not update shipping settings: {params.error ? decodeURIComponent(params.error) : error?.message}
        </p>
      )}

      <section className="mt-7 max-w-5xl">
        <div className="space-y-3">
          {zones.map((zone) => (
            <ShippingZoneForm
              key={zone.id}
              zone={{
                ...zone,
                states: (zone.shipping_zone_states ?? []).map((item) => item.state_name),
              }}
            />
          ))}
          {!zones.length && !error && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No shipping zones configured yet. Add your first zone below.
            </div>
          )}
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add shipping zone</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Create specific state groups first, then add one fallback zone for everywhere else.
          </p>
          <ShippingZoneForm />
        </section>
      </section>
    </main>
  )
}
