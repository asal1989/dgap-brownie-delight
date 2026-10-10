/**
 * Test-only values. They exist ONLY for the end-to-end suite, which runs against the dedicated test database
 * (dgap_test, wiped and re-seeded every run) and a local fake Razorpay API. Never reuse them anywhere real.
 */
export const E2E_PORT = 3100;
export const E2E_FAKE_RAZORPAY_PORT = 3200;
export const E2E_RAZORPAY_KEY_ID = "rzp_test_e2e_key";
export const E2E_RAZORPAY_KEY_SECRET = "e2e_razorpay_key_secret";
export const E2E_WEBHOOK_SECRET = "e2e_webhook_secret";

export const E2E_ADMIN = { email: "e2e-admin@example.test", password: "E2e-Admin-Passw0rd!" };
export const E2E_STAFF = { email: "e2e-staff@example.test", password: "E2e-Staff-Passw0rd!" };
export const E2E_CUSTOMER = { email: "e2e-customer@example.test", password: "E2e-Customer-Passw0rd!" };
export const E2E_COUPON = "E2E10";
