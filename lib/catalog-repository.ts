import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  productSelect,
  toStorefrontProduct,
  type ProductRow,
} from "@/lib/supabase/catalog";
import { catalogQuerySchema } from "@/lib/catalog-query";
import { HttpError } from "@/lib/http";
import { categoryMatchesIntent, isCatalogIntent } from "@/lib/catalog-intents";
import { z } from "zod";
export const getCatalogFacets = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient().rpc("catalog_facets");
    if (error) throw error;
    return data;
  },
  ["catalog-facets"],
  { revalidate: 30, tags: ["catalog"] },
);
export const getCatalogPage = unstable_cache(
  async (options: z.infer<typeof catalogQuerySchema>) => {
    const supabase = createPublicClient();
    let query = supabase
      .from("storefront_catalog")
      .select(productSelect, { count: "exact" });
    if (options.category) query = query.eq("category_slug", options.category);
    if (options.brand) query = query.eq("brand_slug", options.brand);
    if (options.minPrice !== undefined)
      query = query.gte("price", options.minPrice);
    if (options.maxPrice !== undefined)
      query = query.lte("price", options.maxPrice);
    if (options.q) {
      const escaped = options.q.replace(/[%_,().\\"]/g, " ").trim();
      if (escaped)
        query = query.or(
          `name.ilike.%${escaped}%,description.ilike.%${escaped}%`,
        );
    }
    if (options.ids) {
      const ids = z
        .array(z.string().uuid())
        .min(1)
        .max(50)
        .safeParse(options.ids.split(","));
      if (!ids.success) throw new HttpError("Invalid product identifiers");
      query = query.in("id", ids.data);
    }
    const facets = await getCatalogFacets();
    if (
      options.intent &&
      isCatalogIntent(options.intent) &&
      options.intent !== "new-arrivals"
    ) {
      const matching = (
        facets.categories as Array<{ name: string; slug: string }>
      )
        .filter((category) =>
          categoryMatchesIntent(
            category.name,
            options.intent as Parameters<typeof categoryMatchesIntent>[1],
          ),
        )
        .map((category) => category.slug);
      if (matching.length) query = query.in("category_slug", matching);
    }
    const column =
      options.sortBy === "price-asc" || options.sortBy === "price-desc"
        ? "price"
        : options.sortBy === "rating"
          ? "rating"
          : options.sortBy === "popular"
            ? "review_count"
            : "created_at";
    query = query
      .order(column, { ascending: options.sortBy === "price-asc" })
      .order("id");
    const { data, error, count } = await query.range(
      (options.page - 1) * options.limit,
      options.page * options.limit - 1,
    );
    if (error) throw error;
    return {
      success: true,
      data: (data as unknown as ProductRow[]).map(toStorefrontProduct),
      count: count ?? 0,
      page: options.page,
      pageSize: options.limit,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / options.limit)),
      facets,
    };
  },
  ["catalog-page"],
  { revalidate: 30, tags: ["catalog"] },
);
