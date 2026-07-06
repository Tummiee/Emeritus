import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Complete every field with valid information." }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("contact_messages").insert({
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
    })
    if (error) throw error
    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Your message could not be sent right now." }, { status: 500 })
  }
}
