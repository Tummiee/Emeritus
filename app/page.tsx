import type { Metadata } from "next"

import { Homepage } from "@/components/home/homepage"
import { getHomepage } from "@/lib/homepage/repository"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const homepage = await getHomepage()

  return {
    title: homepage.seo.title,
    description: homepage.seo.description,
  }
}

export default async function HomePage() {
  const homepage = await getHomepage()
  return <Homepage content={homepage} />
}
