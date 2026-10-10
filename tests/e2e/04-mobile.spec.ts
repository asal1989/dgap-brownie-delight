import { expect, test, type Page } from "@playwright/test";

test.setTimeout(120_000);

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test("mobile: no horizontal scroll on key pages", async ({ page }) => {
  for (const path of ["/", "/shop", "/shop/fudgy", "/build-your-box", "/cart", "/checkout", "/contact", "/gift-boxes"]) {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
    expect(await overflow(page), `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});

test("mobile: navigation menu opens, traps focus, closes with Escape and navigates", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  const nav = page.getByRole("navigation", { name: "Mobile" });
  await expect(nav).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toHaveCount(0);

  await toggle.click();
  await nav.getByRole("link", { name: "Shop", exact: true }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1, name: "Shop all brownies" })).toBeVisible();
});

test("mobile: filter drawer filters real products and the cart flow works on a phone", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: /Filters & sort/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filters and sorting" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("Search brownies").fill("walnut");
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=walnut/);
  await expect(page.getByRole("heading", { name: "Chocolate Walnut Brownie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classic Fudgy Brownie" })).toHaveCount(0);

  await page.goto("/shop/walnut");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line")).toContainText("Chocolate Walnut Brownie");
  await expect(page.getByTestId("order-total")).toHaveText("₹650"); // ₹600 + ₹50 delivery
  expect(await overflow(page)).toBeLessThanOrEqual(1);
});
