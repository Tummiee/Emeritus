import Link from "next/link";
import { PageNavigation } from "@/components/PageNavigation";
import { pageNumber } from "@/lib/pagination";
import { FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { EntityForm, type OptionMap } from "@/components/admin/EntityForm";
import { FormFeedback } from "@/components/admin/FormFeedback";
import { BulkProductActions } from "@/components/admin/BulkProductActions";
import { ReviewModerationActions } from "@/components/admin/ReviewModerationActions";
import {
  entities,
  type EntityConfig,
  type EntityName,
} from "@/lib/admin/entities";
import { deleteEntity } from "@/lib/admin/entity-actions";
import { createClient } from "@/lib/supabase/server";

function display(value: unknown) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function EntityManager({
  entity,
  searchParams,
}: {
  entity: EntityName;
  searchParams: Promise<{
    page?: string;
    edit?: string;
    new?: string;
    saved?: string;
    error?: string;
    bulk?: string;
    count?: string;
    moderated?: string;
  }>;
}) {
  const config: EntityConfig = entities[entity];
  const params = await searchParams;
  const page = pageNumber(params.page);
  const supabase = await createClient();
  const [
    { data: rows },
    { data: categories },
    { data: brands },
    { data: products },
    productCountResult,
  ] = await Promise.all([
    supabase
      .from(config.table)
      .select("*")
      .order(config.orderBy ?? "created_at", { ascending: false })
      .range((page - 1) * 25, page * 25 - 1),
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("brands").select("id,name").order("name"),
    supabase.from("products").select("id,name").order("name"),
    entity === "products"
      ? supabase.from("products").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
  ]);
  const options: OptionMap = {
    categories:
      categories?.map((item) => ({ label: item.name, value: item.id })) ?? [],
    brands: brands?.map((item) => ({ label: item.name, value: item.id })) ?? [],
    products:
      products?.map((item) => ({ label: item.name, value: item.id })) ?? [],
  };
  const { data: edited, error: editError } = params.edit
    ? await supabase
        .from(config.table)
        .select("*")
        .eq("id", params.edit)
        .maybeSingle()
    : { data: null, error: null };
  if (editError) throw new Error("Record unavailable");
  const editing = edited ?? undefined;
  if (editing && entity === "products") {
    const { data: cost, error } = await supabase
      .from("product_costs")
      .select("cost_price")
      .eq("product_id", editing.id)
      .maybeSingle();
    if (error) throw error;
    editing.cost_price = cost?.cost_price ?? null;
  }
  const showForm = Boolean(params.new || editing);
  const productCount = productCountResult.count ?? 0;
  return (
    <main className="p-5 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Store management
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {config.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{config.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {entity === "products" && (
            <>
              <BulkProductActions count={productCount} />
              <Link
                href="/admin/products/import"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                <FileUp className="size-4" /> Import CSV
              </Link>
            </>
          )}
          <Link
            href={`/admin/${entity}?new=1`}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Add {config.singular}
          </Link>
        </div>
      </div>
      {params.saved && (
        <FormFeedback className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          Changes saved.
        </FormFeedback>
      )}
      {params.error && (
        <FormFeedback error submission={params.error} className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          Could not save: {params.error}
        </FormFeedback>
      )}
      {params.bulk && (
        <FormFeedback className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {Number(params.count ?? 0)} products{" "}
          {params.bulk === "deleted" ? "permanently deleted" : "deactivated"}.
        </FormFeedback>
      )}
      {params.moderated && (
        <FormFeedback className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          Review {params.moderated}.
        </FormFeedback>
      )}
      {showForm && (
        <EntityForm
          key={editing?.id ?? "new"}
          entity={entity}
          config={config}
          editing={editing}
          options={options}
        />
      )}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {config.list.map((column) => (
                  <th className="px-6 py-4 font-semibold" key={column}>
                    {column === "image_url" || column === "logo_url"
                      ? "image"
                      : column.replaceAll("_", " ")}
                  </th>
                ))}
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  {config.list.map((column) => {
                    const isImageColumn =
                      column === "image_url" || column === "logo_url";
                    if (isImageColumn) {
                      const src = row[column];
                      return (
                        <td className="px-6 py-5 align-top" key={column}>
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
                      );
                    }
                    return (
                      <td
                        className="max-w-72 truncate px-6 py-5 align-top"
                        key={column}
                      >
                        {display(row[column])}
                      </td>
                    );
                  })}
                  <td className="px-6 py-5 align-top">
                    <div className="flex justify-end gap-2">
                      {entity === "reviews" && (
                        <ReviewModerationActions
                          id={String(row.id)}
                          status={String(row.status)}
                        />
                      )}
                      <Link
                        href={`/admin/${entity}?edit=${row.id}`}
                        aria-label="Edit"
                        className="rounded-lg border p-2 hover:bg-slate-50"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <form action={deleteEntity}>
                        <input type="hidden" name="entity" value={entity} />
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          aria-label="Delete"
                          className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                        >
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
        {!rows?.length && (
          <p className="p-12 text-center text-sm text-slate-500">
            No records yet. Add the first {config.singular}.
          </p>
        )}
      </div>
      <PageNavigation
        page={page}
        hasNext={rows?.length === 25}
        path={`/admin/${entity}`}
      />
    </main>
  );
}
