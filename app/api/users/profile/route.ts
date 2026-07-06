import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
export async function GET() {
  const { supabase, user } = await context()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const { data, error } = await supabase.from("profiles").select("first_name,last_name,phone,avatar_url,created_at").eq("id", user.id).single()
  if (error) return NextResponse.json({ error: "Profile could not be loaded." }, { status: 500 })
  return NextResponse.json({ data: { ...data, email: user.email } })
}
export async function PUT(request: Request) {
  const { supabase, user } = await context()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const parsed = z.object({ firstName: z.string().trim().min(2).max(60), lastName: z.string().trim().min(2).max(60), phone: z.string().trim().max(30).optional() }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile." }, { status: 400 })
  const { error } = await supabase.from("profiles").update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone || null }).eq("id", user.id)
  if (error) return NextResponse.json({ error: "Profile could not be updated." }, { status: 500 })
  return NextResponse.json({ success: true })
}
