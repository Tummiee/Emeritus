import { afterEach, expect, it, vi } from "vitest";
const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookies.set(name, value);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { createClient } from "@/lib/supabase/server";
import { GET } from "@/app/auth/callback/route";
import { requireUser } from "./session";
import { signOut } from "./actions";

afterEach(() => {
  cookies.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("persists Google callback cookies, accepts an existing session, and logs out", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://google-test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "buyer@example.test",
    aud: "authenticated",
    created_at: new Date().toISOString(),
    app_metadata: { provider: "google" },
    user_metadata: {},
  };
  const token =
    [
      { alg: "HS256", typ: "JWT" },
      { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 },
    ]
      .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
      .join(".") + ".signature";
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/v1/token"))
      return Response.json({
        user,
        access_token: token,
        refresh_token: "test-refresh",
        token_type: "bearer",
        expires_in: 3600,
      });
    if (url.includes("/auth/v1/user")) return Response.json(user);
    if (url.includes("/rest/v1/profiles"))
      return Response.json({ role: "customer" });
    if (url.includes("/auth/v1/logout"))
      return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  // Establish a real SSR PKCE verifier, then simulate the provider's code exchange.
  const client = await createClient();
  await client.auth.signInWithOAuth({
    provider: "google",
    options: { skipBrowserRedirect: true },
  });
  const response = await GET(
    new Request(
      "https://shop.example/auth/callback?flow=oauth&code=fixture-code&next=%2Fcheckout",
    ),
  );
  expect(response.headers.get("Location")).toBe(
    "https://shop.example/checkout",
  );
  expect([...cookies.keys()].some((name) => name.includes("auth-token"))).toBe(
    true,
  );
  expect(await requireUser()).toMatchObject({ id: user.id });
  // A pre-existing password user's session remains usable during the transition.
  user.app_metadata.provider = "email";
  expect(await requireUser()).toMatchObject({
    id: user.id,
    app_metadata: { provider: "email" },
  });
  await expect(signOut()).rejects.toThrow("REDIRECT:/auth/login");
  expect(
    fetchMock.mock.calls.some(([input]) =>
      String(input).includes("/auth/v1/logout"),
    ),
  ).toBe(true);
  expect(
    (await (await createClient()).auth.getSession()).data.session,
  ).toBeNull();
});
