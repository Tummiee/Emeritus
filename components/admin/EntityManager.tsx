import Link from "next/link"
import { FileUp, Pencil, Plus, Trash2 } from "lucide-react"
import { AdminImageField } from "@/components/admin/AdminImageField"
import { BulkProductActions } from "@/components/admin/BulkProductActions"
import { ReviewModerationActions } from "@/components/admin/ReviewModerationActions"
import { entities, type EntityConfig, type EntityName, type Field } from "@/lib/admin/entities"
import { deleteEntity, saveEntity } from "@/lib/admin/entity-actions"
import { createClient } from "@/lib/supabase/server"

type OptionMap = Record<string, Array<{ label: string; value: string }>>

function display(value: unknown) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive"
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function FieldInput({ field, value, options, disabled }: { field: Field; value: unknown; options: OptionMap; disabled?: boolean }) {
  const base = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
  if (field.type === "image") return <AdminImageField name={field.name} initialUrl={String(value ?? "")} required={field.required && !disabled} />
  if (field.type === "boolean") return <label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input name={field.name} type="checkbox" defaultChecked={value === undefined ? true : Boolean(value)} disabled={disabled} className="size-4 accent-primary" /> Enabled</label>
  if (field.type === "textarea" || field.type === "json") return <textarea name={field.name} required={field.required && !disabled} disabled={disabled} rows={field.type === "json" ? 8 : 4} defaultValue={field.type === "json" ? JSON.stringify(value ?? {}, null, 2) : String(value ?? "")} className={`${base} h-auto py-3 font-${field.type === "json" ? "mono" : "sans"}`} />
  if (field.type === "select") {
    const items = field.options ?? (field.optionSource ? options[field.optionSource] : []) ?? []
    return <select name={field.name} required={field.required && !disabled} disabled={disabled} defaultValue={String(value ?? "")} className={base}><option value="">Select…</option>{items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
  }
  const type = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "text"
  const normalized = field.type === "datetime" && value ? String(value).slice(0, 16) : String(value ?? "")
  return <input name={field.name} type={type} step={field.type === "number" ? "0.01" : undefined} required={field.required && !disabled} disabled={disabled} defaultValue={normalized} className={base} />
}

export async function EntityManager({ entity, searchParams }: { entity: EntityName; searchParams: Promise<{ edit?: string; new?: string; saved?: string; error?: string; bulk?: string; count?: string; moderated?: string }> }) {
  const config: EntityConfig = entities[entity]
  const params = await searchParams
  const supabase = await createClient()
  const [{ data: rows }, { data: categories }, { data: brands }, { data: products }, productCountResult] = await Promise.all([
    supabase.from(config.table).select("*").order(config.orderBy ?? "created_at", { ascending: false }).limit(200),
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("products").select("id,name").order("name"),
    entity === "products"
      ? supabase.from("products").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
  ])
  const options: OptionMap = {
    categories: categories?.map((item) => ({ label: item.name, value: item.id })) ?? [],
    brands: brands?.map((item) => ({ label: item.name, value: item.id })) ?? [],
    products: products?.map((item) => ({ label: item.name, value: item.id })) ?? [],
  }
  const editing = params.edit ? rows?.find((row) => row.id === params.edit) : undefined
  const showForm = Boolean(params.new || editing)
  const productCount = productCountResult.count ?? 0
  return <main className="p-5 lg:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Store management</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{config.title}</h1><p className="mt-2 text-sm text-slate-500">{config.description}</p></div><div className="flex flex-wrap gap-2">{entity === "products" && <><BulkProductActions count={productCount} /><Link href="/admin/products/import" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"><FileUp className="size-4" /> Import CSV</Link></>}<Link href={`/admin/${entity}?new=1`} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" /> Add {config.singular}</Link></div></div>
    {params.saved && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Changes saved.</p>}
    {params.error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">Could not save: {decodeURIComponent(params.error)}</p>}
    {params.bulk && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{Number(params.count ?? 0)} products {params.bulk === "deleted" ? "permanently deleted" : "deactivated"}.</p>}
    {params.moderated && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Review {params.moderated}.</p>}
    {showForm && (
      <form action={saveEntity} encType="multipart/form-data" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? `Edit ${config.singular}` : `New ${config.singular}`}</h2>
          <Link href={`/admin/${entity}`} className="text-sm text-slate-500">Cancel</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {config.fields.map((field) => {
            const isFieldDisabled = Boolean(editing && field.readOnlyWhenEditing)
            return (
              <label key={field.name} className={field.type === "textarea" || field.type === "json" || field.type === "image" ? "md:col-span-2 text-sm font-medium" : "text-sm font-medium"}>
                {field.label}
                {field.required && !isFieldDisabled && <span className="text-red-500"> *</span>}
                <FieldInput field={field} value={editing?.[field.name]} options={options} disabled={isFieldDisabled} />
              </label>
            )
          })}
        </div>
        <button className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">Save changes</button>
      </form>
    )}
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {config.list.map((column) => (
                <th className="px-5 py-3" key={column}>
                  {column === "image_url" || column === "logo_url" ? "image" : column.replaceAll("_", " ")}
                </th>
              ))}
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                {config.list.map((column) => {
                  const isImageColumn = column === "image_url" || column === "logo_url"
                  if (isImageColumn) {
                    const src = row[column]
                    return (
                      <td className="px-5 py-3" key={column}>
                        {src ? (
                          <img 
                            src={String(src)} 
                            alt="" 
                            className="size-8 rounded-lg object-cover border border-slate-200 bg-slate-50" 
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )
                  }
                  return (
                    <td className="max-w-72 truncate px-5 py-4" key={column}>
                      {display(row[column])}
                    </td>
                  )
                })}
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {entity === "reviews" && <ReviewModerationActions id={String(row.id)} status={String(row.status)} />}
                    <Link href={`/admin/${entity}?edit=${row.id}`} aria-label="Edit" className="rounded-lg border p-2 hover:bg-slate-50">
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteEntity}>
                      <input type="hidden" name="entity" value={entity} />
                      <input type="hidden" name="id" value={row.id} />
                      <button aria-label="Delete" className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows?.length && <p className="p-12 text-center text-sm text-slate-500">No records yet. Add the first {config.singular}.</p>}
    </div>
  </main>
}
