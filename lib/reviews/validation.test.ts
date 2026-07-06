import { describe, expect, it } from "vitest"

import { reviewSubmissionSchema } from "./validation"

const valid = {
  productId: "11111111-1111-4111-8111-111111111111",
  rating: 5,
  title: "Excellent device",
  content: "The product arrived in good condition and works very well.",
}

describe("review submission validation", () => {
  it("accepts a complete review", () => {
    expect(reviewSubmissionSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects invalid ratings and short content", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false)
    expect(reviewSubmissionSchema.safeParse({ ...valid, content: "Too short" }).success).toBe(false)
  })

  it("rejects non-UUID product identifiers", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, productId: "iphone-15" }).success).toBe(false)
  })
})
