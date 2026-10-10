import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const PAGES = ["/", "/shop", "/shop/fudgy", "/build-your-box", "/gift-boxes", "/about", "/contact", "/cart", "/checkout", "/track", "/account/login", "/privacy"];

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")})`)).toEqual([]);
  });
}

test("admin sign-in page is accessible", async ({ page }) => {
  await page.goto("/admin/login");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("the 3D hero never blocks navigation and respects reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  // Core links are usable immediately, whether or not WebGL has finished loading.
  await expect(page.getByRole("link", { name: "Discover Our Brownies" })).toBeVisible();
  await page.getByRole("link", { name: "Discover Our Brownies" }).click();
  await expect(page).toHaveURL(/\/shop/);
  await ctx.close();
});
