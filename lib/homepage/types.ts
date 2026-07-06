export type HomepageImage = {
  url: string
  alt: string
  focalPoint?: string
}

export type HomepageProduct = {
  id: string
  slug: string
  name: string
  image: HomepageImage
  price: string
  compareAtPrice?: string
  rating: number
  reviewCount: number
  badge?: string
  availability: "in-stock" | "low-stock" | "out-of-stock"
}

export type HomepageContent = {
  seo: { title: string; description: string }
  announcement: string
  navigation: Array<{ label: string; href: string }>
  hero: {
    eyebrow: string
    title: string
    description: string
    primaryAction: { label: string; href: string }
    secondaryAction: { label: string; href: string }
    image: HomepageImage
    images?: HomepageImage[]
    highlights: Array<{ value: string; label: string }>
  }
  categories: Array<{ id: string; name: string; slug: string; image: HomepageImage; count: string }>
  featured: { eyebrow: string; title: string; description: string; products: HomepageProduct[] }
  flashSale: {
    eyebrow: string
    title: string
    description: string
    endsAt?: string
    image: HomepageImage
    products: HomepageProduct[]
  }
  benefits: Array<{ icon: "shield" | "truck" | "headphones" | "refresh"; title: string; description: string }>
  repair: {
    eyebrow: string
    title: string
    description: string
    image: HomepageImage
    services: string[]
    action: { label: string; href: string }
  }
  brands: string[]
  testimonials: Array<{ id: string; quote: string; name: string; detail: string; rating: number }>
  about: {
    eyebrow: string
    title: string
    description: string
    image: HomepageImage
    stats: Array<{ value: string; label: string }>
  }
  store: {
    eyebrow: string
    title: string
    address: string
    hours: string
    phone: string
    mapHref: string
    image: HomepageImage
  }
  newsletter: { eyebrow: string; title: string; description: string }
  footer: {
    description: string
    email: string
    phone: string
    whatsapp: string
    columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>
  }
}
