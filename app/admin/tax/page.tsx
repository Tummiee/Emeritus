import { saveTaxRule } from "@/lib/admin/operations"
import { createClient } from "@/lib/supabase/server"

export default async function TaxPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: rules } = await supabase.from("tax_rules").select("*").order("created_at")
  const rule = rules?.[0]

  return (
    <main className="p-5 lg:p-8">
      <h1 className="text-3xl font-bold">Tax</h1>
      <p className="mt-2 text-slate-500">Configure the VAT displayed and calculated in the customer cart.</p>
      {params.saved && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Tax rule saved.</p>}
      {params.error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">Could not save the tax rule: {decodeURIComponent(params.error)}</p>}
      <form action={saveTaxRule} className="mt-7 max-w-3xl rounded-2xl border bg-white p-5 shadow-sm">
        <input type="hidden" name="id" value={rule?.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Tax name<input name="name" required defaultValue={rule?.name ?? "VAT"} className="mt-1.5 h-11 w-full rounded-xl border px-3 text-slate-700" /></label>
          <label className="text-sm font-medium">Tax rate (%)<input name="rate" type="number" required min="0" max="100" step="0.01" defaultValue={Number(rule?.rate ?? 7.5)} className="mt-1.5 h-11 w-full rounded-xl border px-3 text-slate-700" /></label>
          <label className="text-sm font-medium">Country<input name="country" required maxLength={2} defaultValue={rule?.country_code ?? "NG"} className="mt-1.5 h-11 w-full rounded-xl border px-3 uppercase text-slate-700" /><span className="mt-1 block text-xs font-normal text-slate-500">Use the ISO country code: NG for Nigeria.</span></label>
          <label className="text-sm font-medium">Apply to<input name="appliesTo" required defaultValue={rule?.applies_to ?? "Gadgets and electronics products"} className="mt-1.5 h-11 w-full rounded-xl border px-3 text-slate-700" /></label>
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm font-medium"><input name="active" type="checkbox" defaultChecked={rule?.active ?? true} className="size-4 accent-primary" /> Active tax rule</label>
        <button className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Save tax rule</button>
      </form>
    </main>
  )
}
