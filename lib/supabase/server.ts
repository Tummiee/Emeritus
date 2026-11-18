import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient(options?: { remember?: boolean }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase public environment variables are not configured")

  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookieOptions: options?.remember === false ? { maxAge: undefined } : { maxAge: 60 * 60 * 24 * 30 },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(name, value, { ...cookieOptions, secure: process.env.NODE_ENV === "production", sameSite: "lax" }),
          )
        } catch {
          // Server Components cannot write cookies; middleware performs refresh.
        }
      },
    },
  })
}
