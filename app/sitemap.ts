import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";

const routes = [
  "",
  "/shop",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://emeritusgadgets.com";
  const products: MetadataRoute.Sitemap = [];
  const client = await createClient();
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from("products")
      .select("slug,updated_at")
      .eq("active", true)
      .order("id")
      .range(from, from + 499);
    if (error) throw new Error("Sitemap unavailable");
    products.push(
      ...data.map((product) => ({
        url: `${base}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    );
    if (data.length < 500) break;
  }
  return [
    ...products,
    ...routes.map((route): MetadataRoute.Sitemap[number] => ({
      url: `${base}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" || route === "/shop" ? "daily" : "monthly",
      priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.6,
    })),
  ];
}
