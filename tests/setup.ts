import { config } from "dotenv";

config({ quiet: true });

// Tests only ever touch the dedicated test database.
const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) process.env.DATABASE_URL = testUrl;
if (!process.env.DATABASE_URL?.includes("test")) {
  throw new Error("Refusing to run tests: DATABASE_URL must point at a database whose name contains 'test'.");
}
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.PAYMENT_MODE = "dev";
process.env.RAZORPAY_KEY_ID = "";
process.env.RAZORPAY_KEY_SECRET = "";
process.env.NOTIFICATIONS_DEV_LOG = "";
process.env.RESEND_API_KEY = "";
