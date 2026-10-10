import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_ADMIN, E2E_COUPON, E2E_CUSTOMER, E2E_STAFF } from "./constants";
import { installRazorpayStub, type StubMode } from "./razorpay-stub";

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

let orderNumber = "";

async function signInAdmin(page: Page, creds: { email: string; password: string }) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function newAdminPage(browser: Browser, creds = E2E_ADMIN) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signInAdmin(page, creds);
  await expect(page).toHaveURL(/\/admin$/);
  return { ctx, page };
}

test("1-3. browse products, filter, choose a variant and add to cart", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Classic Fudgy Brownie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chocolate Walnut Brownie" })).toBeVisible();

  // Search filter works against real data.
  await page.getByPlaceholder("Search brownies").fill("walnut");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=walnut/);
  await expect(page.getByRole("heading", { name: "Chocolate Walnut Brownie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classic Fudgy Brownie" })).toHaveCount(0);

  // Empty state.
  await page.getByPlaceholder("Search brownies").fill("zzzzzz");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("heading", { name: "No brownies match" })).toBeVisible();

  // Product page: choose the 500 g variant and add it.
  await page.goto("/shop/fudgy");
  await expect(page.getByRole("heading", { level: 1, name: "Classic Fudgy Brownie" })).toBeVisible();
  await page.locator("label", { hasText: "500 g" }).click();
  await expect(page.getByText("₹600").first()).toBeVisible();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("status").filter({ hasText: "added to your cart" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();

  // The cart survives a reload (persistent cart).
  await page.reload();
  await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();
});

test("4-6. apply a coupon, check out, pay through Razorpay (verified server-side) and view the order", async ({ page }) => {
  let mode: StubMode = "bad-signature";
  await installRazorpayStub(page, () => mode);
  // Re-create the cart for this fresh browser context.
  await page.goto("/shop/fudgy");
  await page.locator("label", { hasText: "500 g" }).click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("link", { name: /Cart, 1 item/ })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByTestId("cart-line")).toContainText("Classic Fudgy Brownie");
  await expect(page.getByTestId("cart-line")).toContainText("500 g");
  // Server-calculated totals: 600 + delivery 50.
  await expect(page.getByTestId("order-total")).toHaveText("₹650");

  // An invalid coupon is rejected; a valid one reduces the total (10% of 600 = 60).
  await page.getByLabel("Coupon code").fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("That coupon code is not valid.")).toBeVisible();
  await page.getByLabel("Coupon code").fill(E2E_COUPON);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/applied\. You save ₹60/)).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText("₹590");

  await page.getByTestId("checkout-link").click();
  await expect(page).toHaveURL(/\/checkout/);

  // Validation: a bad phone number and postal code are rejected before anything is created.
  await page.getByLabel("Full name").fill("Asha Test");
  await page.getByLabel(/Phone \(WhatsApp/).fill("12345");
  await page.getByLabel("Address line 1").fill("12 Test Street");
  await page.getByLabel("Postal code").fill("560001");
  await page.getByTestId("place-order").click();
  await expect(page.getByText("Enter a valid 10-digit Indian mobile number").first()).toBeVisible();

  await page.getByLabel(/Phone \(WhatsApp/).fill("98765 43210");
  await page.getByLabel(/^Email/).fill("asha@example.test");
  await expect(page.getByTestId("order-total")).toHaveText("₹590");
  await page.getByTestId("place-order").click();

  await expect(page).toHaveURL(/\/order-success\/DGAP-\d+/);
  orderNumber = page.url().split("/").pop()!.split("?")[0];
  expect(orderNumber).toMatch(/^DGAP-\d+$/);
  // Unpaid until the SERVER verifies a payment. Each tampering attempt is rejected and leaves the order unpaid.
  await expect(page.getByTestId("success-heading")).toHaveText("Almost there");
  await expect(page.getByTestId("pay-now")).toContainText("₹590");

  await page.getByTestId("pay-now").click(); // forged signature
  await expect(page.getByText("Payment signature could not be verified.")).toBeVisible();
  await expect(page.getByTestId("success-heading")).toHaveText("Almost there");

  mode = "tampered-amount"; // genuine signature, but the payment is for the wrong amount
  await page.getByTestId("pay-now").click();
  await expect(page.getByText("The payment amount did not match the order.")).toBeVisible();
  await expect(page.getByTestId("success-heading")).toHaveText("Almost there");

  mode = "failure"; // customer's bank declines
  await page.getByTestId("pay-now").click();
  await expect(page.getByText("Payment failed (simulated by the test)")).toBeVisible();

  mode = "success"; // retry with a genuinely signed, correct payment
  await page.getByTestId("pay-now").click();
  await expect(page.getByTestId("success-heading")).toContainText("Thank you, Asha");

  // 6. The customer can view and track the order.
  await page.goto(`/account/orders/${orderNumber}`);
  await expect(page.getByTestId("order-number")).toHaveText(orderNumber);
  await expect(page.getByTestId("fulfillment-status")).toHaveText("Confirmed");
  await expect(page.getByTestId("payment-status")).toHaveText("Paid");
  await expect(page.getByTestId("order-timeline")).toContainText("Payment received");
});

test("7-9. admin updates the order status and the customer timeline reflects it", async ({ browser }) => {
  const { ctx, page } = await newAdminPage(browser);

  await page.goto(`/admin/orders?q=${orderNumber}&test=1`);
  await page.getByTestId("order-link").first().click();
  await expect(page.getByRole("heading", { level: 1, name: orderNumber })).toBeVisible();

  await page.getByTestId("status-select").selectOption("PREPARING");
  await page.getByLabel(/^Note/).first().fill("Baking your brownies now");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Status updated. The customer’s tracking page now shows it.")).toBeVisible();

  // Persisted in the database: reload the admin page.
  await page.reload();
  await expect(page.getByTestId("admin-statuses")).toContainText("Preparing");
  await expect(page.getByTestId("admin-timeline")).toContainText("Baking your brownies now");
  await ctx.close();

  // The customer sees it on their tracking page (their cookie still grants access to the order).
  const customerCtx = await browser.newContext();
  const customer = await customerCtx.newPage();
  await customer.goto("/track");
  await customer.getByLabel("Order number").fill(orderNumber);
  await customer.getByLabel("Phone number").fill("9876543210");
  await customer.getByRole("button", { name: "Track order" }).click();
  await expect(customer).toHaveURL(new RegExp(`/account/orders/${orderNumber}`));
  await expect(customer.getByTestId("fulfillment-status")).toHaveText("Preparing");
  await expect(customer.getByTestId("order-timeline")).toContainText("Baking your brownies now");
  await customerCtx.close();
});

test("tracking requires the matching phone number", async ({ page }) => {
  await page.goto("/track");
  await page.getByLabel("Order number").fill(orderNumber);
  await page.getByLabel("Phone number").fill("9999999999");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByText("We could not find an order with those details.")).toBeVisible();
  // And an order page without access redirects to the tracking form.
  await page.goto(`/account/orders/${orderNumber}`);
  await expect(page).toHaveURL(/\/track/);
});

test("10. unauthorised users cannot reach administrative pages or operations", async ({ page, browser, request }) => {
  // Anonymous.
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login/);
  const exportRes = await request.get("/admin/orders/export", { maxRedirects: 0 });
  expect(exportRes.status()).toBe(401);

  // A customer account cannot use the staff sign-in, and its session cannot open admin pages.
  await signInAdmin(page, E2E_CUSTOMER);
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  await page.goto("/account/login");
  await page.getByLabel("Email").fill(E2E_CUSTOMER.email);
  await page.getByLabel("Password").fill(E2E_CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  const customerExport = await page.request.get("/admin/orders/export", { maxRedirects: 0 });
  expect(customerExport.status()).toBe(403);

  // Staff can run orders but not change settings, refund or export.
  const { ctx, page: staff } = await newAdminPage(browser, E2E_STAFF);
  await staff.goto("/admin/settings");
  await expect(staff).toHaveURL(/\/admin\/forbidden/);
  await staff.goto("/admin/audit-logs");
  await expect(staff).toHaveURL(/\/admin\/forbidden/);
  const staffExport = await staff.request.get("/admin/orders/export", { maxRedirects: 0 });
  expect(staffExport.status()).toBe(403);
  await staff.goto("/admin/orders?test=1");
  await expect(staff.getByTestId("orders-table")).toBeVisible();
  await staff.getByTestId("order-link").first().click();
  await expect(staff.getByRole("heading", { name: "Refund" })).toHaveCount(0);
  await ctx.close();
});

test("custom box builder validates the composition and adds a priced box to the cart", async ({ page }) => {
  await page.goto("/build-your-box");
  await expect(page.getByTestId("box-price")).toHaveText("₹400");
  // Cannot add an unfilled box.
  await page.getByTestId("box-add-to-cart").click();
  await expect(page.getByText(/Please choose 4 more brownies/)).toBeVisible();

  const buttons = page.getByRole("button", { name: /^Add one / });
  await buttons.nth(0).click();
  await buttons.nth(0).click();
  await buttons.nth(1).click();
  await buttons.nth(1).click();
  await expect(page.getByTestId("box-progress")).toContainText("Your box is full: 4 of 4");
  await expect(buttons.nth(0)).toBeDisabled(); // cannot overfill

  await page.getByTestId("box-add-to-cart").click();
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line")).toContainText("Custom brownie box");
  await expect(page.getByTestId("cart-line")).toContainText("2 ×");
  await expect(page.getByTestId("order-total")).toHaveText("₹450");
});
