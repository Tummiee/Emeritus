import type { HomepageContent } from "./types"

export type HomepageSectionRow = {
  section_key: string
  title: string
  content: unknown
}

export type HeroSlideRow = {
  title: string
  subtitle: string
  image_url: string
  image_alt: string
  cta_label: string
  cta_href: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function mergeHomepageValue<T>(fallback: T, override: unknown): T {
  if (override === undefined || override === null) return fallback
  if (Array.isArray(fallback)) {
    return (Array.isArray(override) && override.length ? override : fallback) as T
  }
  if (isRecord(fallback)) {
    if (!isRecord(override)) return fallback
    const merged: Record<string, unknown> = { ...fallback }
    for (const [key, fallbackValue] of Object.entries(fallback)) {
      merged[key] = mergeHomepageValue(fallbackValue, override[key])
    }
    return merged as T
  }
  return (typeof override === typeof fallback ? override : fallback) as T
}

export function applyHomepageSections(
  fallback: HomepageContent,
  rows: HomepageSectionRow[],
  hero?: HeroSlideRow,
): HomepageContent {
  const content = structuredClone(fallback)
  for (const row of rows) {
    const key = row.section_key as keyof HomepageContent
    if (!(key in content)) continue
    const current = content[key]
    const sectionOverride = isRecord(row.content)
      ? ("title" in (current as object) ? { ...row.content, title: row.title } : row.content)
      : row.content
    ;(content as unknown as Record<string, unknown>)[key] = mergeHomepageValue(current, sectionOverride)
  }
  if (hero) {
    content.hero = mergeHomepageValue(content.hero, {
      title: hero.title,
      description: hero.subtitle,
      image: { url: hero.image_url, alt: hero.image_alt },
      primaryAction: { label: hero.cta_label, href: hero.cta_href },
    })
  }
  return content
}
