import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ oauth: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: mocks.oauth } }),
}));
import { startGoogleSignIn } from "./google";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("window", { location: { origin: "https://shop.example" } });
  mocks.oauth.mockResolvedValue({
    data: { url: "https://accounts.google.com/example" },
    error: null,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it.each(["/checkout", "//evil.example"])(
  "preserves browser OAuth and sanitizes %s",
  async (next) => {
    await startGoogleSignIn(next);
    expect(mocks.oauth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `https://shop.example/auth/callback?flow=oauth&next=${encodeURIComponent(next === "/checkout" ? next : "/account")}`,
        queryParams: { prompt: "select_account" },
      },
    });
  },
);
it.each([
  { data: { url: null }, error: null },
  { data: { url: null }, error: { message: "private provider failure" } },
])(
  "rejects failed initiation without exposing provider details",
  async (result) => {
    mocks.oauth.mockResolvedValue(result);
    await expect(startGoogleSignIn("/account")).rejects.toThrow(
      "Google sign-in could not be started",
    );
  },
);
it("shows one Google action and no password or registration controls", () => {
  const html = renderToStaticMarkup(
    createElement(GoogleSignIn, {
      notice: "Use Google for account creation and sign-in.",
    }),
  );
  expect(html).toContain("Continue with Google");
  expect(html).toContain(
    "Your account is created when you continue with Google",
  );
  expect(html).toContain('role="status"');
  expect(html).toContain('href="/terms"');
  expect(html).toContain('href="/privacy"');
  expect(html).not.toMatch(
    /<input|Forgot password|Remember me|Resend verification|\/auth\/register/,
  );
  expect(html.match(/<button /g) ?? []).toHaveLength(1);
});
