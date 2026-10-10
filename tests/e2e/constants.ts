/**
 * Test-only accounts. They exist ONLY in the dedicated end-to-end test database (dgap_test), which
 * `global-setup.ts` wipes and re-seeds on every run. Never reuse these values anywhere real.
 */
export const E2E_PORT = 3100;
export const E2E_ADMIN = { email: "e2e-admin@example.test", password: "E2e-Admin-Passw0rd!" };
export const E2E_STAFF = { email: "e2e-staff@example.test", password: "E2e-Staff-Passw0rd!" };
export const E2E_CUSTOMER = { email: "e2e-customer@example.test", password: "E2e-Customer-Passw0rd!" };
export const E2E_COUPON = "E2E10";
