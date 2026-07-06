import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 })
  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
