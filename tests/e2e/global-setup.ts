import { execFileSync } from "node:child_process";
import type { Server } from "node:http";
import { config as loadEnv } from "dotenv";
import { startFakeRazorpay } from "./fake-razorpay";

loadEnv({ quiet: true });

/**
 * Before every run: wipe + re-seed the TEST database (clearly labelled test prices and users) and start the
 * fake Razorpay API. Returns a teardown that stops the fake API.
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://dgap@127.0.0.1:5433/dgap_test";
  if (!url.includes("test")) throw new Error("E2E must run against a test database");
  execFileSync("npx", ["tsx", "tests/e2e/seed.ts"], { stdio: "inherit", shell: true, env: { ...process.env, DATABASE_URL: url } });

  const fake: Server = await startFakeRazorpay();
  return async () => {
    await new Promise<void>((resolve) => fake.close(() => resolve()));
  };
}
