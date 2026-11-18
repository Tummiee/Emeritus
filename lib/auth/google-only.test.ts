import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  limit: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/http")>()),
  rateLimit: mocks.limit,
}));
vi.mock("@/components/Header", () => ({ default: vi.fn() }));
vi.mock("@/components/Footer", () => ({ default: vi.fn() }));
vi.mock("@/components/auth/AuthForm", () => ({ AuthForm: vi.fn() }));

import {
  login,
  register,
  forgotPassword,
  resendVerification,
  resetPassword,
} from "./actions";
import { changePassword } from "@/lib/account/actions";
import { POST as loginApi } from "@/app/api/auth/login/route";
import { POST as registerApi } from "@/app/api/auth/register/route";
import RegisterPage from "@/app/auth/register/page";
import ForgotPage from "@/app/auth/forgot-password/page";
import ResetPage from "@/app/auth/reset-password/page";
import ResendPage from "@/app/auth/resend-verification/page";
import {
  EMAIL_PASSWORD_AUTH_ENABLED,
  PASSWORD_AUTH_DISABLED_MESSAGE,
} from "./policy";

beforeEach(() => {
  vi.clearAllMocks();
});
describe("disabled email/password authentication", () => {
  it("is explicitly disabled", () => {
    expect(EMAIL_PASSWORD_AUTH_ENABLED).toBe(false);
  });
  it.each([
    login,
    register,
    forgotPassword,
    resendVerification,
    resetPassword,
    changePassword,
  ])("blocks %s before any provider or limiter work", async (action) => {
    expect(await action({ status: "idle" }, new FormData())).toMatchObject({
      status: "error",
      message: PASSWORD_AUTH_DISABLED_MESSAGE,
    });
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.headers).not.toHaveBeenCalled();
  });
  it.each([loginApi, registerApi])(
    "returns 403 without reading malformed API bodies",
    async (post) => {
      const request = new Request("https://shop.example/api/auth", {
        method: "POST",
        body: "not-json",
      });
      const response = await post(request);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        code: "password-auth-disabled",
        error: PASSWORD_AUTH_DISABLED_MESSAGE,
      });
      expect(request.bodyUsed).toBe(false);
      expect(mocks.client).not.toHaveBeenCalled();
      expect(mocks.limit).not.toHaveBeenCalled();
    },
  );
});

describe.each([RegisterPage, ForgotPage, ResetPage, ResendPage])(
  "legacy page %s",
  (page) => {
    it.each([
      "/checkout?from=signup",
      "//evil.example",
      "/\\evil.example",
      undefined,
    ])("redirects safely (%s)", async (next) => {
      await expect(
        page({
          searchParams: Promise.resolve({
            next,
            email: "private@example.test",
            code: "private-code",
          }),
        }),
      ).rejects.toThrow(
        `REDIRECT:/auth/login?notice=google-only&next=${encodeURIComponent(next === "/checkout?from=signup" ? next : "/account")}`,
      );
      expect(mocks.client).not.toHaveBeenCalled();
    });
  },
);
