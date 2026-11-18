import { describe, expect, it } from "vitest"

import { ADMIN_IMAGE_MAX_BYTES, imageExtension, validateAdminImage } from "./image-upload"

describe("admin image upload validation", () => {
  it("accepts supported image files", () => {
    expect(validateAdminImage({ type: "image/webp", size: 1024 })).toBeNull()
    expect(imageExtension("image/webp")).toBe("webp")
  })

  it("rejects empty, oversized, and unsupported files", () => {
    expect(validateAdminImage({ type: "image/png", size: 0 })).toBe("empty-image")
    expect(validateAdminImage({ type: "image/png", size: ADMIN_IMAGE_MAX_BYTES + 1 })).toBe("image-too-large")
    expect(validateAdminImage({ type: "image/svg+xml", size: 1024 })).toBe("unsupported-image-type")
  })
})
