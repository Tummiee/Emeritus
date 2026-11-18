import "server-only";

import { redirect } from "next/navigation";
import { safeNextPath } from "./helpers";

export function redirectLegacyAuth(next: unknown) {
  redirect(
    `/auth/login?notice=google-only&next=${encodeURIComponent(safeNextPath(next))}`,
  );
}
