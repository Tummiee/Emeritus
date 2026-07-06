export type Field = {
  name: string
  label: string
  type?: "text" | "textarea" | "number" | "boolean" | "date" | "datetime" | "json" | "select" | "image"
  required?: boolean
  optionSource?: "categories" | "brands" | "products"
  options?: Array<{ label: string; value: string }>
}

export type EntityConfig = {
  table: string
  title: string
  description: string
  singular: string
  fields: Field[]
  list: string[]
  orderBy?: string
}

export const entities = {
  categories: { table: "categories", title: "Categories", description: "Organize the storefront catalog.", singular: "category", list: ["name", "slug", "active", "display_order"], fields: [
    { name: "name", label: "Name", required: true }, { name: "slug", label: "Slug", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "image_url", label: "Category image", type: "image" }, { name: "display_order", label: "Display order", type: "number" }, { name: "active", label: "Active", type: "boolean" },
  ]},
  brands: { table: "brands", title: "Brands", description: "Manage manufacturers and storefront branding.", singular: "brand", list: ["name", "slug", "active", "display_order"], fields: [
    { name: "name", label: "Name", required: true }, { name: "slug", label: "Slug", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "logo_url", label: "Brand logo", type: "image" }, { name: "display_order", label: "Display order", type: "number" }, { name: "active", label: "Active", type: "boolean" },
  ]},
  products: { table: "products", title: "Products", description: "Manage product content, pricing, merchandising, and SEO.", singular: "product", list: ["name", "sku", "price", "active"], fields: [
    { name: "name", label: "Name", required: true }, { name: "slug", label: "Slug", required: true }, { name: "sku", label: "SKU", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "image_url", label: "Primary product image", type: "image" },
    { name: "category_id", label: "Category", type: "select", optionSource: "categories" }, { name: "brand_id", label: "Brand", type: "select", optionSource: "brands" },
    { name: "price", label: "Price", type: "number", required: true }, { name: "compare_at_price", label: "Compare-at price", type: "number" }, { name: "cost_price", label: "Cost price", type: "number" },
    { name: "featured", label: "Featured", type: "boolean" }, { name: "active", label: "Active", type: "boolean" }, { name: "seo_title", label: "SEO title" }, { name: "seo_description", label: "SEO description", type: "textarea" },
  ]},
  hero: { table: "hero_slides", title: "Hero manager", description: "Control homepage hero slides, imagery, calls to action, and ordering.", singular: "slide", list: ["title", "cta_label", "active", "display_order"], fields: [
    { name: "title", label: "Title", required: true }, { name: "subtitle", label: "Subtitle", type: "textarea" }, { name: "image_url", label: "Hero image", type: "image", required: true }, { name: "image_alt", label: "Image alt text", required: true },
    { name: "cta_label", label: "CTA label" }, { name: "cta_href", label: "CTA destination" }, { name: "display_order", label: "Display order", type: "number" }, { name: "active", label: "Active", type: "boolean" },
  ]},
  homepage: { table: "homepage_sections", title: "Homepage manager", description: "Override the default homepage one section at a time. Missing fields safely retain their built-in content.", singular: "section", list: ["section_key", "title", "active", "display_order"], fields: [
    { name: "section_key", label: "Section key", required: true }, { name: "title", label: "Title", required: true }, { name: "content", label: "Section JSON", type: "json", required: true }, { name: "display_order", label: "Display order", type: "number" }, { name: "active", label: "Active", type: "boolean" },
  ]},
  coupons: { table: "coupons", title: "Coupons", description: "Configure discounts, redemption windows, and usage limits.", singular: "coupon", list: ["code", "discount_type", "discount_value", "active"], fields: [
    { name: "code", label: "Code", required: true }, { name: "description", label: "Description" }, { name: "discount_type", label: "Discount type", type: "select", options: [{ label: "Percentage", value: "percentage" }, { label: "Fixed amount", value: "fixed" }] },
    { name: "discount_value", label: "Discount value", type: "number", required: true }, { name: "minimum_amount", label: "Minimum order", type: "number" }, { name: "usage_limit", label: "Usage limit", type: "number" },
    { name: "starts_at", label: "Starts at", type: "datetime" }, { name: "expires_at", label: "Expires at", type: "datetime" }, { name: "active", label: "Active", type: "boolean" },
  ]},
  reviews: { table: "product_reviews", title: "Reviews", description: "Moderate ratings and respond to customer feedback.", singular: "review", list: ["rating", "title", "status", "created_at"], fields: [
    { name: "product_id", label: "Product", type: "select", optionSource: "products", required: true }, { name: "rating", label: "Rating", type: "number", required: true }, { name: "title", label: "Title" }, { name: "body", label: "Review", type: "textarea", required: true },
    { name: "status", label: "Status", type: "select", options: [{ label: "Pending", value: "pending" }, { label: "Approved", value: "approved" }, { label: "Rejected", value: "rejected" }] }, { name: "admin_response", label: "Admin response", type: "textarea" },
  ]},
} satisfies Record<string, EntityConfig>

export type EntityName = keyof typeof entities
