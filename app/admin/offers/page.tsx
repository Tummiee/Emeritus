import Link from "next/link"
import Image from "next/image"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { AdminImageField } from "@/components/admin/AdminImageField"
import { deletePromotion, savePromotion } from "@/lib/admin/promotion-actions"
import { createClient } from "@/lib/supabase/server"

type SearchParams = {
  edit?: string
  new?: string
  saved?: string
  deleted?: string
  error?: string
}

function localDate(value: unknown) {
  return value ? String(value).slice(0, 16) : ""
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const [{ data: offers }, { data: products }, { data: coupons }] = await Promise.all([
    supabase.from("promotions").select("*,promotion_products(product_id,sale_price,display_order)").order("display_order").order("created_at", { ascending: false }),
    supabase.from("products").select("id,name,price,image_url,active").eq("active", true).order("name"),
    supabase.from("coupons").select("id,code,active").eq("active", true).order("code"),
  ])
  const editing = params.edit ? offers?.find((offer) => offer.id === params.edit) : undefined
  const selected = new Map<string, number | string | null>(
    (editing?.promotion_products ?? []).map((relation: { product_id: string; sale_price: number | string | null }) => [
      relation.product_id,
      relation.sale_price,
    ]),
  )
  const showForm = Boolean(params.new || editing)
  const input = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

  return (
    <main className="p-5 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Store management</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Offers</h1>
          <p className="mt-2 text-sm text-slate-500">Create scheduled storefront campaigns and explicitly choose their products.</p>
        </div>
        <Link href="/admin/offers?new=1" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          <Plus className="size-4" /> Add offer
        </Link>
      </div>

      {(params.saved || params.deleted) && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {params.deleted ? "Offer deleted." : "Offer saved."}
        </p>
      )}
      {params.error && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Could not save: {decodeURIComponent(params.error)}
        </p>
      )}

      {showForm && (
        <form action={savePromotion} encType="multipart/form-data" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editing ? "Edit offer" : "New offer"}</h2>
            <Link href="/admin/offers" className="text-sm text-slate-500">Cancel</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Internal name *<input className={input} name="name" required defaultValue={editing?.name ?? ""} /></label>
            <label className="text-sm font-medium">Offer type *
              <select className={input} name="promotion_type" required defaultValue={editing?.promotion_type ?? "flash_sale"}>
                <option value="flash_sale">Flash sale</option>
                <option value="featured_offer">Featured offer</option>
                <option value="seasonal">Seasonal campaign</option>
              </select>
            </label>
            <label className="text-sm font-medium">Eyebrow<input className={input} name="eyebrow" defaultValue={editing?.eyebrow ?? ""} placeholder="Limited release" /></label>
            <label className="text-sm font-medium">Headline *<input className={input} name="headline" required defaultValue={editing?.headline ?? ""} /></label>
            <label className="text-sm font-medium md:col-span-2">Description
              <textarea className={`${input} h-auto py-3`} rows={3} name="description" defaultValue={editing?.description ?? ""} />
            </label>
            <label className="text-sm font-medium md:col-span-2">Campaign artwork
              <AdminImageField name="image_url" initialUrl={editing?.image_url ?? ""} />
            </label>
            <label className="text-sm font-medium md:col-span-2">Image alt text<input className={input} name="image_alt" defaultValue={editing?.image_alt ?? ""} /></label>
            <label className="text-sm font-medium">Starts at<input className={input} type="datetime-local" name="starts_at" defaultValue={localDate(editing?.starts_at)} /></label>
            <label className="text-sm font-medium">Ends at<input className={input} type="datetime-local" name="ends_at" defaultValue={localDate(editing?.ends_at)} /></label>
            <label className="text-sm font-medium">Optional coupon
              <select className={input} name="coupon_id" defaultValue={editing?.coupon_id ?? ""}>
                <option value="">No coupon</option>
                {coupons?.map((coupon) => <option value={coupon.id} key={coupon.id}>{coupon.code}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Display order<input className={input} type="number" name="display_order" defaultValue={editing?.display_order ?? 0} /></label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input className="size-4 accent-primary" type="checkbox" name="active" defaultChecked={editing?.active ?? false} />
              Published
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="font-semibold">Offer products *</legend>
            <p className="mt-1 text-xs text-slate-500">Select at least one product. An offer price is optional, but when supplied it must be below the regular price.</p>
            <div className="mt-3 max-h-[30rem] overflow-y-auto rounded-xl border border-slate-200">
              {products?.map((product) => (
                <div key={product.id} className="grid grid-cols-[auto_3.5rem_1fr_9rem] items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                  <input type="checkbox" name="product_ids" value={product.id} defaultChecked={selected.has(product.id)} className="size-4 accent-primary" />
                  <div className="relative size-12 overflow-hidden rounded-lg border bg-slate-50">
                    <Image src={product.image_url?.trim() || "/product-placeholder.svg"} alt="" fill unoptimized className="object-contain p-1" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">Regular: ₦{Number(product.price).toLocaleString("en-NG")}</p>
                    <p className="mt-1 text-[11px] text-slate-400">This product image is used in the offer.</p>
                  </div>
                  <input
                    aria-label={`Offer price for ${product.name}`}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    name={`sale_price:${product.id}`}
                    defaultValue={selected.get(product.id) ?? ""}
                    placeholder="Offer price"
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <button className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Save offer</button>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Window</th><th className="px-5 py-3">Products</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {offers?.map((offer) => (
                <tr key={offer.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-4"><strong>{offer.name}</strong><p className="text-xs capitalize text-slate-500">{String(offer.promotion_type).replaceAll("_", " ")}</p></td>
                  <td className="px-5 py-4 text-xs text-slate-500">{offer.starts_at ? new Date(offer.starts_at).toLocaleString() : "Immediately"}<br />to {offer.ends_at ? new Date(offer.ends_at).toLocaleString() : "No expiry"}</td>
                  <td className="px-5 py-4">{offer.promotion_products?.length ?? 0}</td>
                  <td className="px-5 py-4">{offer.active ? "Published" : "Draft"}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2">
                    <Link href={`/admin/offers?edit=${offer.id}`} aria-label="Edit offer" className="rounded-lg border p-2 hover:bg-slate-50"><Pencil className="size-4" /></Link>
                    <form action={deletePromotion}><input type="hidden" name="id" value={offer.id} /><button aria-label="Delete offer" className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button></form>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!offers?.length && <p className="p-12 text-center text-sm text-slate-500">No offers yet. Create the first campaign.</p>}
      </div>
    </main>
  )
}
