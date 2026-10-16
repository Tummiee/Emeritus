import "server-only";
import {
  revalidateTag,
  revalidatePath as nextRevalidatePath,
} from "next/cache";
export function invalidateCommerce() {
  for (const tag of ["catalog", "products", "homepage"])
    revalidateTag(tag, { expire: 0 });
}
export function revalidatePath(path: string, type?: "layout" | "page") {
  invalidateCommerce();
  nextRevalidatePath(path, type);
}
