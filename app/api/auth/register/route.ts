import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const parsed = z.object({
    email: z.string().email(), password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    firstName: z.string().trim().min(2).max(60), lastName: z.string().trim().min(2).max(60),
  }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid account details." }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email, password: parsed.data.password,
    options: { data: { first_name: parsed.data.firstName, last_name: parsed.data.lastName } },
  })
  if (error) return NextResponse.json({ error: "Account could not be created." }, { status: 400 })
  return NextResponse.json({ user: { id: data.user?.id, email: data.user?.email }, verificationRequired: !data.session }, { status: 201 })
}
