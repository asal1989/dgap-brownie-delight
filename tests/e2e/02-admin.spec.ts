import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN, E2E_WEBHOOK_SECRET } from "./constants";
import { fakeApi } from "./razorpay-stub";

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("dashboard shows real figures with a stated period", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin?period=all&test=1");
  await expect(page.getByText(/Period:/)).toBeVisible();
  // The journey spec paid one order (₹590): gross sales come from real data, not a placeholder.
  await expect(page.getByTestId("stat-gross")).toContainText("₹590");
  await expect(page.getByTestId("stat-total")).toContainText(/[1-9]/);
  await expect(page.getByTestId("stat-net")).toContainText("₹590");
});

test("admin creates a product, prices a variant, publishes it, and it appears on the shop", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/products/new");
  await page.getByTestId("product-name").fill("E2E Salted Caramel Brownie");
  await page.getByLabel("Short description").fill("A test brownie created by the end-to-end suite.");
  await page.getByLabel("Full description").fill("Created through the admin to prove the catalogue is database driven.");
  await page.getByLabel("Status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Salted Caramel Brownie" })).toBeVisible();

  // An invalid price is rejected; a valid one is saved as integer paise.
  await page.getByTestId("variant-label").last().fill("Box of 2");
  await page.getByTestId("variant-sku").last().fill("E2E-SC-2");
  await page.getByTestId("variant-price").last().fill("12.345");
  await page.getByRole("button", { name: "Add variant" }).click();
  await expect(page.getByText("Enter prices as plain rupee amounts")).toBeVisible();
  await page.getByTestId("variant-price").last().fill("249.50");
  await page.getByRole("button", { name: "Add variant" }).click();
  await expect(page.getByText("Variant added.")).toBeVisible();

  await page.goto("/shop?q=Salted%20Caramel");
  await expect(page.getByRole("heading", { name: "E2E Salted Caramel Brownie" })).toBeVisible();
  await expect(page.getByText("₹249.50").first()).toBeVisible();
  // The price filter works against real data.
  await page.goto("/shop?min=300&q=Salted");
  await expect(page.getByRole("heading", { name: "E2E Salted Caramel Brownie" })).toHaveCount(0);
  await page.goto("/shop?max=300&q=Salted");
  await expect(page.getByRole("heading", { name: "E2E Salted Caramel Brownie" })).toBeVisible();
});

test("inventory adjustments are recorded and can never go below zero", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/inventory");
  const row = page.locator('tr[data-sku="T-WALNUT-1KG"]');
  const before = Number(await row.getByTestId("stock-value").innerText());
  await row.getByTestId("stock-amount").fill("5");
  await row.getByRole("button", { name: "Apply" }).click();
  // Confirmations appear as a toast (the table re-renders after the change).
  await expect(page.getByRole("status").getByText(`Stock changed from ${before} to ${before + 5}.`)).toBeVisible();
  await page.reload();
  await expect(page.locator('tr[data-sku="T-WALNUT-1KG"]').getByTestId("stock-value")).toHaveText(String(before + 5));
  await expect(page.getByText(/RESTOCK/).first()).toBeVisible();

  const again = page.locator('tr[data-sku="T-WALNUT-1KG"]');
  await again.locator('select[name="mode"]').selectOption("remove");
  await again.getByTestId("stock-amount").fill("9999");
  await again.getByRole("button", { name: "Apply" }).click();
  await expect(again.getByText("Stock cannot go below zero.")).toBeVisible();
});

test("cancelling a paid order restocks but does NOT refund; the admin then refunds explicitly", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/orders?test=1");
  await page.getByTestId("order-link").first().click();
  await expect(page.getByTestId("admin-statuses")).toContainText("Paid");

  // Cancellation needs a reason and an explicit confirmation (the form's own validation blocks it).
  await page.getByTestId("cancel-reason").fill("Customer changed their mind");
  await page.getByTestId("cancel-confirm").check();
  await page.getByRole("button", { name: "Cancel this order" }).click();
  await expect(page.getByText(/Order cancelled and stock returned/)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("admin-statuses")).toContainText("Cancelled");
  await expect(page.getByTestId("admin-statuses")).toContainText("Paid");
  await expect(page.getByText("Cancelled after payment: refund required")).toBeVisible();

  // Partial refund, then the remainder.
  await page.getByTestId("refund-amount").fill("100");
  await page.getByTestId("refund-reason").fill("Partial goodwill refund");
  await page.getByTestId("refund-confirm").check();
  await page.getByRole("button", { name: "Issue refund" }).click();
  await expect(page.getByText("Refund processed.")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("admin-statuses")).toContainText("Partially refunded");

  await page.getByTestId("refund-amount").fill("490");
  await page.getByTestId("refund-reason").fill("Remaining balance");
  await page.getByTestId("refund-confirm").check();
  await page.getByRole("button", { name: "Issue refund" }).click();
  await expect(page.getByText("Refund processed.")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("admin-statuses")).toContainText("Refunded");
  // The refunds really went through the (fake) Razorpay API, for exactly these amounts.
  const sent = (await (await page.request.get(`${fakeApi}/__test/refunds`)).json()) as { amount: number }[];
  expect(sent.map((r) => r.amount)).toEqual([10_000, 49_000]);
  // Nothing left to refund, so the refund form is gone: over-refunding is impossible from the UI too.
  await expect(page.getByTestId("refund-amount")).toHaveCount(0);

  // The audit trail recorded each sensitive action.
  await page.goto("/admin/audit-logs?action=order.");
  await expect(page.getByTestId("audit-table")).toContainText("order.cancel");
  await expect(page.getByTestId("audit-table")).toContainText("order.refund.request");
});

test("settings save persists and is reflected on the storefront", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Announcement message").fill("E2E announcement bar");
  await page.getByTestId("save-settings").click();
  await expect(page.getByTestId("settings-result")).toHaveText("Settings saved.");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Announcement" })).toHaveText("E2E announcement bar");

  // Invalid input is rejected with a clear message and nothing changes.
  await page.goto("/admin/settings");
  await page.getByTestId("option-fee-0").fill("abc");
  await page.getByTestId("save-settings").click();
  await expect(page.getByTestId("settings-result")).toContainText("enter a plain rupee amount");
});

test("webhook endpoint rejects bad signatures and acknowledges signed events once", async ({ request }) => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x", order_id: "order_unknown", amount: 100, currency: "INR" } } } });
  const headers = { "content-type": "application/json" };
  const bad = await request.post("/api/webhooks/razorpay", { data: body, headers: { ...headers, "x-razorpay-signature": "deadbeef" } });
  expect(bad.status()).toBe(401);
  const none = await request.post("/api/webhooks/razorpay", { data: body, headers });
  expect(none.status()).toBe(401);

  const sig = createHmac("sha256", E2E_WEBHOOK_SECRET).update(body).digest("hex");
  const signed = { ...headers, "x-razorpay-signature": sig, "x-razorpay-event-id": "evt_e2e_1" };
  const ok = await request.post("/api/webhooks/razorpay", { data: body, headers: signed });
  expect(ok.status()).toBe(200);
  const again = await request.post("/api/webhooks/razorpay", { data: body, headers: signed });
  expect(await again.text()).toBe("Duplicate event ignored");
});

test("security headers and robots rules are present", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["referrer-policy"]).toBeTruthy();
  expect(h["x-powered-by"]).toBeUndefined();
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
});
