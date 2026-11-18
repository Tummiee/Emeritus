import { expect, test } from "@playwright/test";

test("Google-only sign-in preserves the destination and account chooser", async ({
  page,
}, testInfo) => {
  await page.goto("/auth/login?next=%2Fcheckout");
  const panel = page.getByRole("region", { name: "Sign in to your account" });
  await expect(
    panel.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(panel.locator("input")).toHaveCount(0);
  await expect(
    panel.getByRole("link", { name: "Terms", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Privacy Policy" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("google-sign-in.png"),
    fullPage: true,
  });

  // Observe the rendered pending state before OAuth starts a navigation.
  // Locator assertions during a pending navigation wait for that navigation.
  let pendingSeen = false;
  await page.exposeFunction("reportGooglePending", () => {
    pendingSeen = true;
  });
  await panel.evaluate((element) => {
    const observer = new MutationObserver(() => {
      const button = element.querySelector("button");
      if (button?.disabled && button.textContent?.includes("Redirecting")) {
        void (
          window as unknown as { reportGooglePending: () => Promise<void> }
        ).reportGooglePending();
        observer.disconnect();
      }
    });
    observer.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  });

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let captured!: (url: URL) => void;
  const authorization = new Promise<URL>((resolve) => {
    captured = resolve;
  });
  await page.route("**/auth/v1/authorize?**", async (route) => {
    captured(new URL(route.request().url()));
    await gate;
    await route.fulfill({
      contentType: "text/html",
      body: "<h1>Google account chooser fixture</h1>",
    });
  });
  try {
    await panel
      .getByRole("button", { name: "Continue with Google" })
      .click({ noWaitAfter: true });
    const url = await authorization;
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    const callback = new URL(url.searchParams.get("redirect_to")!);
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("flow")).toBe("oauth");
    expect(callback.searchParams.get("next")).toBe("/checkout");
    await expect.poll(() => pendingSeen).toBe(true);
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: "Google account chooser fixture" }),
  ).toBeVisible();
});

test("legacy links and cancelled Google sign-in return to the single sign-in page", async ({
  page,
}) => {
  for (const path of [
    "register",
    "forgot-password",
    "reset-password",
    "resend-verification",
  ]) {
    await page.goto(
      `/auth/${path}?next=%2Fcheckout&email=private%40example.test&code=private-code`,
    );
    await expect(page).toHaveURL(
      /\/auth\/login\?notice=google-only&next=%2Fcheckout$/,
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Use Google" }),
    ).toBeVisible();
  }
  await page.goto(
    "/auth/callback?flow=oauth&error=access_denied&next=%2Fcheckout",
  );
  await expect(page).toHaveURL(/\/auth\/login\?error=oauth&next=%2Fcheckout$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Google sign-in could not be completed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("legacy authentication APIs reject password requests", async ({
  request,
}) => {
  for (const endpoint of ["login", "register"]) {
    const response = await request.post(`/api/auth/${endpoint}`, {
      data: "malformed",
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "password-auth-disabled",
    });
  }
});
