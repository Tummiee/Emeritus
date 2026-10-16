import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductDetailPage from "@/components/ProductDetailPage";

const loadProduct = cache(async (identifier: string) => {
  const { data, error } = await (
    await createClient()
  )
    .from("storefront_catalog")
    .select("name,slug,description,seo_title,seo_description,image_url")
    .eq(/^[0-9a-f-]{36}$/i.test(identifier) ? "id" : "slug", identifier)
    .maybeSingle();
  if (error) throw new Error("Product unavailable");
  return data;
});
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const product = await loadProduct((await params).id);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return {
    title: product.seo_title || product.name,
    description: product.seo_description || product.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image_url || "/product-placeholder.svg"],
    },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await loadProduct((await params).id))) notFound();
  return <ProductDetailPage />;
}
