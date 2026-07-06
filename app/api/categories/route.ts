import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const [{ data: categories, error: categoriesError }, { data: products }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id,name,slug,description,image_url,display_order")
        .eq("active", true)
        .order("display_order"),
      supabase.from("products").select("category_id").eq("active", true),
    ]);

  if (categoriesError) {
    return NextResponse.json(
      { error: categoriesError.message },
      { status: 500 },
    );
  }

  const productCounts = new Map<string, number>();
  for (const product of products ?? []) {
    if (!product.category_id) continue;
    productCounts.set(
      product.category_id,
      (productCounts.get(product.category_id) ?? 0) + 1,
    );
  }

  const data = (categories ?? []).map((row) => ({
    ...row,
    image: row.image_url,
    count: productCounts.get(row.id) ?? 0,
    product_count: productCounts.get(row.id) ?? 0,
  }));

  return NextResponse.json({ success: true, data, count: data.length });
}
