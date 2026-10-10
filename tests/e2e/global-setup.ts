import { execFileSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

loadEnv({ quiet: true });

/** Wipe the TEST database and re-seed it (clearly-labelled test prices and users) before every run. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://dgap@127.0.0.1:5433/dgap_test";
  if (!url.includes("test")) throw new Error("E2E must run against a test database");
  execFileSync("npx", ["tsx", "tests/e2e/seed.ts"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, DATABASE_URL: url },
  });
}
