import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function waitForCatalog(page: Page) {
  const response = await page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/products" &&
      response.request().method() === "GET",
    { timeout: test.info().timeout },
  );
  expect(response.ok()).toBe(true);
  await response.finished();
}
async function waitForQuote(page: Page, status = 200) {
  const response = await page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/checkout/quote" &&
      response.request().method() === "POST",
    { timeout: test.info().timeout },
  );
  expect(response.status()).toBe(status);
  await response.finished();
}
const productId = "00000000-0000-4000-8000-000000000010";
const line = {
  productId,
  name: "Test phone",
  price: 10000,
  image: "/logo2.png",
  quantity: 1,
};
test("homepage renders its existing remote images without a configuration crash", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/_next/image?**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" />',
    }),
  );
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toBeVisible();
  expect(errors).toEqual([]);
});
test("lightbox supports focus, Escape and backdrop closing", async ({
  page,
}) => {
  await page.goto("/product/test-phone");
  const trigger = page.getByRole("button", {
    name: "View larger image of Test phone",
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Test phone image viewer" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close image viewer" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).not.toBeVisible();
});
test("shop preserves URL filters on reload and browser navigation", async ({
  page,
  isMobile,
}) => {
  await Promise.all([
    waitForCatalog(page),
    page.goto("/shop?brand=apple&maxPrice=15000&page=2"),
  ]);
  if (isMobile)
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Apple", exact: true }),
  ).toBeChecked();
  await Promise.all([waitForCatalog(page), page.reload()]);
  await expect(page).toHaveURL(/brand=apple/);
  await expect(page).toHaveURL(/maxPrice=15000/);
  if (isMobile)
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("radio", { name: "All Brands", exact: true }).click();
  await expect(page).not.toHaveURL(/brand=/);
  await Promise.all([waitForCatalog(page), page.goBack()]);
  await expect(
    page.getByRole("radio", { name: "Apple", exact: true }),
  ).toBeChecked();
});
test("cart distinguishes missing tax, explicit zero and quote failure with retry", async ({
  page,
}) => {
  await page.addInitScript(
    ({ line }) =>
      localStorage.setItem("emeritus-cart:guest", JSON.stringify([line])),
    { line },
  );
  let mode: "none" | "zero" | "error" = "none";
  await page.route("**/api/checkout/quote", async (route) => {
    if (mode === "error") {
      await route.fulfill({
        status: 503,
        json: { error: "Quote unavailable" },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          lines: [{ productId, unitPrice: 10000, quantity: 1 }],
          subtotal: 10000,
          discount: 0,
          shipping: null,
          total: 10000,
          couponCode: null,
          quoteId: "a".repeat(32),
          tax:
            mode === "zero"
              ? { name: "VAT", rate: 0, amount: 0, taxableAmount: 10000 }
              : null,
        },
      },
    });
  });
  await Promise.all([waitForQuote(page), page.goto("/cart")]);
  await expect(
    page.getByRole("heading", { name: "Shopping Cart" }),
  ).toBeVisible();
  await expect(page.getByText("VAT (0%)", { exact: true })).toHaveCount(0);
  mode = "zero";
  await Promise.all([waitForQuote(page), page.reload()]);
  await expect(page.getByText("VAT (0%)", { exact: true })).toBeVisible();
  mode = "error";
  await Promise.all([waitForQuote(page, 503), page.reload()]);
  await expect(
    page.getByText("Tax unavailable", { exact: true }),
  ).toBeVisible();
  mode = "zero";
  await Promise.all([
    waitForQuote(page),
    page.getByRole("button", { name: "Retry", exact: true }).click(),
  ]);
  await expect(page.getByText("VAT (0%)", { exact: true })).toBeVisible();
});
test("checkout requires sign-in", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/auth\/login\?next=/);
});
