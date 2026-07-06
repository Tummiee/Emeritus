export type CatalogIntent = "new-arrivals" | "phones" | "laptops" | "audio"

const intentTerms: Record<CatalogIntent, string[]> = {
  "new-arrivals": [
    "new arrival", "new arrivals", "new product", "new products", "new release",
    "new releases", "latest", "latest products", "just arrived", "recent arrivals",
    "fresh stock", "new in", "recently added",
  ],
  phones: [
    "phone", "phones", "smartphone", "smartphones", "mobile", "mobile phone",
    "mobile phones", "cell phone", "cell phones", "cellular", "handset", "handsets",
    "android", "android phone", "iphone", "iphones", "feature phone", "phone battery",
    "mobile phone battery", "phone accessory", "phone accessories", "mobile accessory",
    "mobile accessories", "phone case", "phone charger",
  ],
  laptops: [
    "laptop", "laptops", "notebook", "notebooks", "notebook computer",
    "portable computer", "portable computers", "ultrabook", "ultrabooks", "macbook",
    "macbooks", "chromebook", "chromebooks", "windows laptop", "gaming laptop",
    "laptop battery", "laptop charger", "laptop accessory", "laptop accessories",
  ],
  audio: [
    "audio", "sound", "headphone", "headphones", "earphone", "earphones", "earbud",
    "earbuds", "airpods", "headset", "headsets", "speaker", "speakers", "bluetooth speaker",
    "soundbar", "soundbars", "microphone", "microphones", "amplifier", "amplifiers",
    "home audio", "portable audio", "wireless audio", "audio accessory", "audio accessories",
  ],
}

export function normalizeCatalogText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function isCatalogIntent(value: string | null): value is CatalogIntent {
  return value === "new-arrivals" || value === "phones" || value === "laptops" || value === "audio"
}

export function categoryMatchesIntent(category: string, intent: CatalogIntent) {
  const normalized = ` ${normalizeCatalogText(category)} `
  return intentTerms[intent].some((term) => {
    const candidate = ` ${normalizeCatalogText(term)} `
    return normalized.includes(candidate) || candidate.includes(normalized)
  })
}

export function catalogIntentForLabel(label: string): CatalogIntent | null {
  if (categoryMatchesIntent(label, "new-arrivals")) return "new-arrivals"
  if (categoryMatchesIntent(label, "phones")) return "phones"
  if (categoryMatchesIntent(label, "laptops")) return "laptops"
  if (categoryMatchesIntent(label, "audio")) return "audio"
  return null
}
