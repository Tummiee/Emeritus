import "server-only"

import { homepageSeed } from "./content"
import {
  applyHomepageSections,
  type HeroSlideRow,
  type HomepageSectionRow,
} from "./merge"
import type { HomepageContent, HomepageProduct } from "./types"
import {
  isPromotionCurrentlyActive,
  resolveProductImage,
} from "@/lib/commerce/promotions"

type CatalogProductRow = {
  id: string
  slug: string
  name: string
  image_url: string | null
  price: number | string
  compare_at_price: number | string | null
  featured: boolean
  inventory: { quantity: number; reserved: number } | Array<{ quantity: number; reserved: number }> | null
  product_reviews: Array<{ rating: number }> | null
}

type PromotionProductRow = {
  sale_price: number | string | null
  display_order: number
  products: CatalogProductRow | CatalogProductRow[] | null
}

type PromotionRow = {
  id: string
  name: string
  promotion_type: "flash_sale" | "featured_offer" | "seasonal"
  eyebrow: string
  headline: string
  description: string
  image_url: string | null
  image_alt: string
  starts_at: string | null
  ends_at: string | null
  display_order: number
  promotion_products: PromotionProductRow[]
}

function hasValidSupabaseConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) return false
  try {
    const hostname = new URL(url).hostname
    return hostname.endsWith(".supabase.co") && !hostname.includes("your_project_ref")
  } catch {
    return false
  }
}

function formatNaira(value: number | string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function firstInventory(value: CatalogProductRow["inventory"]) {
  return Array.isArray(value) ? value[0] : value
}

function firstProduct(value: PromotionProductRow["products"]) {
  return Array.isArray(value) ? value[0] : value
}

export function toHomepageProduct(row: CatalogProductRow): HomepageProduct {
  const inventory = firstInventory(row.inventory)
  const available = inventory ? Math.max(0, inventory.quantity - inventory.reserved) : 0
  const ratings = row.product_reviews ?? []
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    image: { url: row.image_url || "/placeholder.jpg", alt: row.name },
    price: formatNaira(row.price),
    compareAtPrice: row.compare_at_price == null ? undefined : formatNaira(row.compare_at_price),
    rating: ratings.length ? ratings.reduce((total, review) => total + review.rating, 0) / ratings.length : 0,
    reviewCount: ratings.length,
    badge: row.featured ? "Featured" : undefined,
    availability: available === 0 ? "out-of-stock" : available <= 5 ? "low-stock" : "in-stock",
  }
}

async function fetchJson<T>(url: string, key: string): Promise<T> {
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 60, tags: ["homepage", "products"] },
  })
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export async function getHomepage(): Promise<HomepageContent> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!hasValidSupabaseConfig(url, key)) {
    return {
      ...homepageSeed,
      featured: { ...homepageSeed.featured, products: [] },
      flashSale: { ...homepageSeed.flashSale, products: [] },
    }
  }

  try {
    const baseUrl = url as string
    const authKey = key as string
    const productFields =
      "id,slug,name,image_url,price,compare_at_price,featured,inventory(quantity,reserved),product_reviews(rating)"
    const promotionFields =
      "id,name,promotion_type,eyebrow,headline,description,image_url,image_alt,starts_at,ends_at,display_order,promotion_products(sale_price,display_order,products(id,slug,name,image_url,price,compare_at_price,featured,inventory(quantity,reserved),product_reviews(rating)))"
    const [sections, heroes, products, promotions] = await Promise.all([
      fetchJson<HomepageSectionRow[]>(
        `${baseUrl}/rest/v1/homepage_sections?select=section_key,title,content&active=eq.true&order=display_order.asc`,
        authKey,
      ).catch(() => []),
      fetchJson<HeroSlideRow[]>(
        `${baseUrl}/rest/v1/hero_slides?select=title,subtitle,image_url,image_alt,cta_label,cta_href&active=eq.true&order=display_order.asc&limit=1`,
        authKey,
      ).catch(() => []),
      fetchJson<CatalogProductRow[]>(
        `${baseUrl}/rest/v1/products?select=${encodeURIComponent(productFields)}&active=eq.true&order=created_at.desc&limit=12`,
        authKey,
      ).catch(() => []),
      fetchJson<PromotionRow[]>(
        `${baseUrl}/rest/v1/promotions?select=${encodeURIComponent(promotionFields)}&active=eq.true&order=display_order.asc,created_at.desc`,
        authKey,
      ).catch(() => []),
    ])

    const content = applyHomepageSections(homepageSeed, sections, heroes[0])
    const catalog = products.map(toHomepageProduct)
    const featured = products
      .map((product, index) => ({ product, mapped: catalog[index] }))
      .filter(({ product }) => product.featured)
      .slice(0, 8)
      .map(({ mapped }) => mapped)
    const now = Date.now()
    const activePromotion = promotions.find((promotion) =>
      isPromotionCurrentlyActive({
        starts_at: promotion.starts_at,
        ends_at: promotion.ends_at,
        productCount: promotion.promotion_products.length,
      }, now),
    )
    const sale = activePromotion
      ? activePromotion.promotion_products
          .sort((a, b) => a.display_order - b.display_order)
          .map((relation) => {
            const product = firstProduct(relation.products)
            if (!product) return null
            const regularPrice = Number(product.price)
            const salePrice = relation.sale_price == null ? null : Number(relation.sale_price)
            const mapped = toHomepageProduct({
              ...product,
              price: salePrice ?? product.price,
              compare_at_price: salePrice === null ? product.compare_at_price : product.price,
            })
            mapped.image = {
              url: resolveProductImage(product.image_url),
              alt: product.name,
            }
            if (salePrice !== null && regularPrice > 0) {
              mapped.badge = `Save ${Math.round(((regularPrice - salePrice) / regularPrice) * 100)}%`
            }
            return mapped
          })
          .filter((product): product is HomepageProduct => product !== null && product.availability !== "out-of-stock")
      : []

    return {
      ...content,
      featured: { ...content.featured, products: featured },
      flashSale: activePromotion
        ? {
            ...content.flashSale,
            eyebrow: activePromotion.eyebrow || content.flashSale.eyebrow,
            title: activePromotion.headline,
            description: activePromotion.description,
            endsAt: activePromotion.ends_at ?? undefined,
            image: activePromotion.image_url
              ? {
                  url: activePromotion.image_url,
                  alt: activePromotion.image_alt || activePromotion.headline,
                }
              : content.flashSale.image,
            products: sale,
          }
        : { ...content.flashSale, endsAt: undefined, products: [] },
    }
  } catch {
    return {
      ...homepageSeed,
      featured: { ...homepageSeed.featured, products: [] },
      flashSale: { ...homepageSeed.flashSale, products: [] },
    }
  }
}
