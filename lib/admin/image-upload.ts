import { imageSourceAllowed } from "@/lib/image-policy.mjs";
export const ADMIN_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const ADMIN_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isUnselectedImageFile(file: {
  name: string;
  size: number;
  type: string;
}) {
  // Next's Busboy decoder receives no filename for an untouched input and
  // constructs File([], undefined), which gives it the name "undefined".
  return (
    file.size === 0 &&
    (file.name === "" || file.name === "undefined") &&
    (file.type === "" || file.type === "application/octet-stream")
  );
}

export function imageUrlAllowed(value: string) {
  if (value.startsWith("/") && !value.startsWith("//"))
    return imageSourceAllowed(value);
  try {
    const url = new URL(value);
    return (
      imageSourceAllowed(value) &&
      (url.protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export function validateAdminImage(file: { size: number; type: string }) {
  if (file.size <= 0) return "empty-image";
  if (file.size > ADMIN_IMAGE_MAX_BYTES) return "image-too-large";
  if (
    !ADMIN_IMAGE_TYPES.includes(file.type as (typeof ADMIN_IMAGE_TYPES)[number])
  )
    return "unsupported-image-type";
  return null;
}

export function imageExtension(type: string) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[type];
}
