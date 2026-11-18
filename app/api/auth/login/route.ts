import { httpError, readJson, rateLimit } from "@/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_PASSWORD_AUTH_ENABLED,
  PASSWORD_AUTH_DISABLED_MESSAGE,
} from "@/lib/auth/policy";

export async function POST(request: Request) {
  if (!EMAIL_PASSWORD_AUTH_ENABLED) {
    return NextResponse.json(
      { code: "password-auth-disabled", error: PASSWORD_AUTH_DISABLED_MESSAGE },
      { status: 403 },
    );
  }
  try {
    await rateLimit(request, "login", 10);
    const parsed = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .safeParse(await readJson(request));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 400 },
      );
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error)
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    return NextResponse.json({
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (error) {
    return httpError(error);
  }
}
