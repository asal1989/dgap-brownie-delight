import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { E2E_FAKE_RAZORPAY_PORT, E2E_PORT, E2E_RAZORPAY_KEY_ID, E2E_RAZORPAY_KEY_SECRET, E2E_WEBHOOK_SECRET } from "./tests/e2e/constants";

loadEnv({ quiet: true });
const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://dgap@127.0.0.1:5433/dgap_test";
const channel = process.env.PW_CHANNEL ?? "chrome";

/**
 * The suite runs against a PRODUCTION build (`next build` + `next start`): stable, fast and exactly what ships.
 * Payments go through the real Razorpay code path against a local fake Razorpay API (tests/e2e/fake-razorpay.ts).
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Uses the Chrome already installed on the machine; no browser download needed.
    channel,
  },
  projects: [
    { name: "desktop", testIgnore: /04-mobile\.spec\.ts/, use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", testMatch: /04-mobile\.spec\.ts/, use: { ...devices["Pixel 7"], channel } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/api/health`,
    timeout: 600_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: testDb,
      SITE_URL: `http://localhost:${E2E_PORT}`,
      PAYMENT_MODE: "razorpay",
      RAZORPAY_KEY_ID: E2E_RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: E2E_RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: E2E_WEBHOOK_SECRET,
      RAZORPAY_API_BASE: `http://127.0.0.1:${E2E_FAKE_RAZORPAY_PORT}/v1`,
      ORDER_ACCESS_SECRET: "e2e-order-access-secret-0123456789",
      CRON_SECRET: "e2e-cron-secret",
      NOTIFICATIONS_DEV_LOG: "",
      RESEND_API_KEY: "",
      WHATSAPP_NUMBER: "",
    },
  },
});
