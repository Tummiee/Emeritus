export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  featured: boolean;
  created_at: string;
  categories:
    | { id: string; slug: string; name: string }
    | { id: string; slug: string; name: string }[]
    | null;
  brands: { name: string } | { name: string }[] | null;
  inventory:
    | { quantity: number; reserved: number }
    | { quantity: number; reserved: number }[]
    | null;
  rating?: number | string;
  review_count?: number | string;
  brand_slug?: string;
  product_reviews?: { rating: number }[];
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function toStorefrontProduct(row: ProductRow) {
  const ratings = row.product_reviews ?? [];
  const inventory = first(row.inventory);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    comparePrice:
      row.compare_at_price == null ? undefined : Number(row.compare_at_price),
    image: row.image_url || "/product-placeholder.svg",
    category: first(row.categories)?.name ?? "Uncategorized",
    categorySlug: first(row.categories)?.slug ?? "uncategorized",
    brand: first(row.brands)?.name ?? "Unbranded",
    brandSlug: row.brand_slug ?? "",
    rating:
      row.rating !== undefined
        ? Number(row.rating)
        : ratings.length
          ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
          : 0,
    reviews: Number(row.review_count ?? ratings.length),
    inStock: Boolean(inventory && inventory.quantity - inventory.reserved > 0),
    featured: row.featured,
    createdAt: row.created_at,
  };
}

export const productSelect =
  "id,slug,name,description,image_url,price,compare_at_price,featured,created_at,categories,brands,inventory,rating,review_count,brand_slug";
