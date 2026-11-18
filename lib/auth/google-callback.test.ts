import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  exchange: vi.fn(),
  user: vi.fn(),
  profile: vi.fn(),
  oauth: vi.fn(),
  signOut: vi.fn(),
  url: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/auth/url", () => ({ getSiteUrl: mocks.url }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { GET } from "@/app/auth/callback/route";
import { signInWithGoogle, signOut } from "./actions";
function request(query: string) {
  return new Request(`https://shop.example/auth/callback?${query}`);
}
function destination(response: Response) {
  return response.headers.get("Location");
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({
    auth: {
      exchangeCodeForSession: mocks.exchange,
      getUser: mocks.user,
      signInWithOAuth: mocks.oauth,
      signOut: mocks.signOut,
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
    }),
  });
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.user.mockResolvedValue({
    data: { user: { id: "existing-user" } },
    error: null,
  });
  mocks.profile.mockResolvedValue({ data: { role: "customer" } });
  mocks.url.mockResolvedValue("https://shop.example");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Google callback", () => {
  it.each(["signup", "recovery", "", "unexpected"])(
    "rejects legacy flow %s without exchanging codes",
    async (flow) => {
      expect(
        destination(
          await GET(request(`flow=${flow}&code=secret&next=%2Fcheckout`)),
        ),
      ).toBe(
        "https://shop.example/auth/login?notice=google-only&next=%2Fcheckout",
      );
      expect(mocks.client).not.toHaveBeenCalled();
      expect(mocks.exchange).not.toHaveBeenCalled();
    },
  );
  it.each(["", "&error=access_denied", "&code=secret&error=access_denied"])(
    "handles missing/cancelled authorization %s",
    async (extra) => {
      expect(
        destination(await GET(request(`flow=oauth&next=%2Fcheckout${extra}`))),
      ).toBe("https://shop.example/auth/login?error=oauth&next=%2Fcheckout");
      expect(mocks.exchange).not.toHaveBeenCalled();
    },
  );
  it.each(["/checkout?from=login", "//evil.example", "/\\evil.example"])(
    "preserves safe destinations %s",
    async (next) => {
      expect(
        destination(
          await GET(
            request(`flow=oauth&code=secret&next=${encodeURIComponent(next)}`),
          ),
        ),
      ).toBe(
        `https://shop.example${next.startsWith("/checkout") ? next : "/account"}`,
      );
      expect(mocks.exchange).toHaveBeenCalledWith("secret");
    },
  );
  it.each(["admin", "super_admin"])("preserves %s routing", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role } });
    expect(
      destination(
        await GET(request("flow=oauth&code=secret&next=%2Fcheckout")),
      ),
    ).toBe("https://shop.example/admin");
  });
  it("allows new users with no profile result to reach their account", async () => {
    mocks.profile.mockResolvedValue({ data: null });
    expect(destination(await GET(request("flow=oauth&code=secret")))).toBe(
      "https://shop.example/account",
    );
  });
  it("handles expired codes without logging the code", async () => {
    mocks.exchange.mockResolvedValue({
      error: { code: "invalid_grant", status: 400 },
    });
    expect(
      destination(await GET(request("flow=oauth&code=private-oauth-code"))),
    ).toContain("error=oauth");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "private-oauth-code",
    );
  });
  it.each([null, { id: "user" }])(
    "requires a verified session user (user=%j)",
    async (user) => {
      mocks.user.mockResolvedValue({
        data: { user },
        error: user ? { code: "invalid_session" } : null,
      });
      expect(
        destination(await GET(request("flow=oauth&code=secret"))),
      ).toContain("error=oauth");
      expect(mocks.profile).not.toHaveBeenCalled();
    },
  );
  it("handles provider connection errors with a retry route", async () => {
    mocks.client.mockRejectedValue(new Error("Network unavailable"));
    expect(
      destination(
        await GET(request("flow=oauth&code=secret&next=%2Fcheckout")),
      ),
    ).toBe("https://shop.example/auth/login?error=oauth&next=%2Fcheckout");
  });
});

it("retains server Google initiation and logout", async () => {
  mocks.oauth.mockResolvedValue({
    data: { url: "https://accounts.google.com/example" },
    error: null,
  });
  const form = new FormData();
  form.set("next", "/checkout");
  await expect(signInWithGoogle(form)).rejects.toThrow(
    "REDIRECT:https://accounts.google.com/example",
  );
  expect(mocks.oauth).toHaveBeenCalledWith(
    expect.objectContaining({
      provider: "google",
      options: expect.objectContaining({
        redirectTo:
          "https://shop.example/auth/callback?flow=oauth&next=%2Fcheckout",
      }),
    }),
  );
  await expect(signOut()).rejects.toThrow("REDIRECT:/auth/login");
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
