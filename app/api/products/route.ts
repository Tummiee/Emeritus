import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  productSelect,
  toStorefrontProduct,
  type ProductRow,
} from "@/lib/supabase/catalog";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(productSelect)
    .eq("active", true);
  if (params.get("category"))
    query = query.eq("categories.slug", params.get("category")!);
  if (params.get("brand"))
    query = query.eq("brands.name", params.get("brand")!);
  if (params.get("minPrice"))
    query = query.gte("price", Number(params.get("minPrice")));
  if (params.get("maxPrice"))
    query = query.lte("price", Number(params.get("maxPrice")));
  const sort = params.get("sortBy");
  if (sort === "price-asc") query = query.order("price");
  else if (sort === "price-desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  const products = (data as unknown as ProductRow[]).map(toStorefrontProduct);
  if (sort === "rating" || sort === "popular")
    products.sort((a, b) =>
      sort === "rating" ? b.rating - a.rating : b.reviews - a.reviews,
    );
  return NextResponse.json({
    success: true,
    data: products,
    count: products.length,
  });
}
