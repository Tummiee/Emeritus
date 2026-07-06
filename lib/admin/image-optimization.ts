import "server-only"

import sharp from "sharp"

import { validateAdminImage } from "@/lib/admin/image-upload"

const DEFAULT_IMAGE_OUTPUT_MAX_BYTES = 3 * 1024 * 1024

export type AdminImagePurpose = "catalog" | "hero" | "media" | "repair"

export type OptimizedAdminImage = {
  data: Buffer
  contentType: "image/webp"
  extension: "webp"
  size: number
  width: number
  height: number
}

const presets: Record<AdminImagePurpose, { width: number; height: number; quality: number; maxBytes?: number }> = {
  // Product imagery needs enough resolution for close inspection and retina displays.
  catalog: { width: 1800, height: 1800, quality: 84 },
  // Hero artwork is wider and benefits from a little more retained detail.
  hero: { width: 2400, height: 1400, quality: 86 },
  // General media remains versatile without storing camera-sized originals.
  media: { width: 2000, height: 2000, quality: 84 },
  // Repair evidence may be inspected full-screen, so retain more pixels and detail.
  repair: { width: 2400, height: 2400, quality: 90, maxBytes: 5 * 1024 * 1024 },
}

export async function optimizeAdminImage(
  file: File,
  purpose: AdminImagePurpose = "media",
): Promise<OptimizedAdminImage> {
  const validationError = validateAdminImage(file)
  if (validationError) throw new Error(validationError)

  const preset = presets[purpose]

  try {
    const input = Buffer.from(await file.arrayBuffer())
    const image = sharp(input, {
      animated: file.type === "image/gif",
      limitInputPixels: 40_000_000,
    })
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) throw new Error("invalid-image")

    const { data, info } = await image
      .rotate()
      .resize({
        width: preset.width,
        height: preset.height,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: preset.quality,
        alphaQuality: 90,
        effort: 5,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true })

    if (data.byteLength > (preset.maxBytes ?? DEFAULT_IMAGE_OUTPUT_MAX_BYTES)) {
      throw new Error("optimized-image-too-large")
    }

    return {
      data,
      contentType: "image/webp",
      extension: "webp",
      size: data.byteLength,
      width: info.width,
      height: info.height,
    }
  } catch (error) {
    if (error instanceof Error && error.message === "optimized-image-too-large") throw error
    throw new Error("invalid-or-unsupported-image")
  }
}
