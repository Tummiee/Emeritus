import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function BookRepairPage() {
  const user = await getCurrentUser()
  redirect(user ? "/account/repairs" : "/auth/login?next=/account/repairs")
}
