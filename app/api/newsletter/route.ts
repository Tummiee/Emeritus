import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({ email: z.string().trim().email().max(254) })

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email: parsed.data.email.toLowerCase(),
          active: true,
          source: "homepage",
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        },
        { onConflict: "email" },
      )
    if (error) throw error
    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Could not save your subscription right now." }, { status: 500 })
  }
}
