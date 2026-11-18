import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import {
  productSelect,
  toStorefrontProduct,
  type ProductRow,
} from "@/lib/supabase/catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createPublicClient();
  const identifier = (await params).id;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      identifier,
    );
  const productQuery = supabase
    .from("storefront_catalog")
    .select(productSelect);
  const { data, error } = await (
    isUuid
      ? productQuery.eq("id", identifier)
      : productQuery.eq("slug", identifier)
  ).single();
  if (error && error.code !== "PGRST116")
    return NextResponse.json(
      { error: "Product temporarily unavailable" },
      { status: 503 },
    );
  if (!data)
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const product = toStorefrontProduct(data as unknown as ProductRow);

  const { data: reviews, error: reviewError } = await supabase
    .from("storefront_reviews")
    .select("*")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false })
    .limit(25);
  if (reviewError)
    return NextResponse.json(
      { error: "Reviews temporarily unavailable" },
      { status: 503 },
    );
  const mappedReviews = (reviews ?? []).map((review) => ({
    id: review.id,
    productId: review.product_id,
    rating: review.rating,
    title: review.title,
    content: review.body,
    author: review.author,
    date: review.created_at,
    verified: review.verified_purchase,
  }));
  return NextResponse.json({
    success: true,
    data: { ...product, reviewsList: mappedReviews },
  });
}
