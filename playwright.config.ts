import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { E2E_PORT } from "./tests/e2e/constants";

loadEnv({ quiet: true });
const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://dgap@127.0.0.1:5433/dgap_test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Uses the Chrome already installed on the machine; no browser download needed.
    channel: process.env.PW_CHANNEL ?? "chrome",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome" } },
  ],
  webServer: {
    command: `npx next dev -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/api/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testDb,
      NEXT_DIST_DIR: ".next-e2e",
      SITE_URL: `http://localhost:${E2E_PORT}`,
      PAYMENT_MODE: "dev",
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      NOTIFICATIONS_DEV_LOG: "",
      RESEND_API_KEY: "",
      WHATSAPP_NUMBER: "",
    },
  },
});
