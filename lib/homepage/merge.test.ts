import { describe, expect, it } from "vitest"

import { homepageSeed } from "./content"
import { applyHomepageSections, mergeHomepageValue } from "./merge"

describe("homepage content merging", () => {
  it("preserves defaults when an override is incomplete or malformed", () => {
    const merged = mergeHomepageValue(homepageSeed.hero, {
      title: "Admin title",
      highlights: [],
      image: "invalid",
    })

    expect(merged.title).toBe("Admin title")
    expect(merged.description).toBe(homepageSeed.hero.description)
    expect(merged.highlights).toEqual(homepageSeed.hero.highlights)
    expect(merged.image).toEqual(homepageSeed.hero.image)
  })

  it("applies admin section and hero records without removing other content", () => {
    const result = applyHomepageSections(
      homepageSeed,
      [{ section_key: "about", title: "A changed title", content: { description: "Changed copy" } }],
      {
        title: "New hero",
        subtitle: "New description",
        image_url: "/hero.jpg",
        image_alt: "Hero",
        cta_label: "Browse",
        cta_href: "/shop",
      },
    )

    expect(result.about.title).toBe("A changed title")
    expect(result.about.description).toBe("Changed copy")
    expect(result.about.stats).toEqual(homepageSeed.about.stats)
    expect(result.hero.title).toBe("New hero")
    expect(result.hero.secondaryAction).toEqual(homepageSeed.hero.secondaryAction)
  })
})
