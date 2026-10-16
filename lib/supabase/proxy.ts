import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/helpers";

const protectedPrefixes = [
  "/account",
  "/admin",
  "/checkout",
  "/payment/callback",
];
const authPrefixes = ["/auth/login", "/auth/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && protectedPrefixes.some((prefix) => path.startsWith(prefix))) {
    const login = request.nextUrl.clone();
    login.pathname = "/auth/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    const redirected = NextResponse.redirect(login);
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  }
  if (user && authPrefixes.includes(path)) {
    const redirected = NextResponse.redirect(
      new URL(
        safeNextPath(request.nextUrl.searchParams.get("next")),
        request.url,
      ),
    );
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    return redirected;
  }
  return response;
}
