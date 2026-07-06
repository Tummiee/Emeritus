export const ADMIN_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const ADMIN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const

export function validateAdminImage(file: { size: number; type: string }) {
  if (file.size <= 0) return "empty-image"
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return "image-too-large"
  if (!ADMIN_IMAGE_TYPES.includes(file.type as (typeof ADMIN_IMAGE_TYPES)[number])) return "unsupported-image-type"
  return null
}

export function imageExtension(type: string) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[type]
}
