import { config as loadEnv } from "dotenv";
import { E2E_ADMIN, E2E_COUPON, E2E_CUSTOMER, E2E_STAFF } from "./constants";

loadEnv({ quiet: true });

/** Wipe the TEST database and seed a small catalogue with clearly-labelled TEST prices, plus test users. */
async function main() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://dgap@127.0.0.1:5433/dgap_test";
  if (!process.env.DATABASE_URL.includes("test")) throw new Error("E2E must run against a test database");
  (process.env as Record<string, string>).NODE_ENV = "test";

  const { db } = await import("../../src/lib/db");
  const { hashPassword } = await import("../../src/lib/auth/password");
  const { resetDb, seedCatalog } = await import("../helpers/fixtures");

  await resetDb();
  const f = await seedCatalog({ settings: { whatsappNumber: "919000000000", freeDeliveryThresholdPaise: null } });
  await db.productImage.create({ data: { productId: f.fudgy.id, url: "/images/classic-fudgy.jpg", alt: "Fudgy brownies", sortOrder: 0 } });
  await db.productImage.create({ data: { productId: f.walnut.id, url: "/images/walnut.jpg", alt: "Walnut brownie", sortOrder: 0 } });
  await db.productImage.create({ data: { productId: f.box.id, url: "/images/gift-box.jpg", alt: "A box", sortOrder: 0 } });
  await db.product.update({ where: { id: f.fudgy.id }, data: { isBestseller: true, isFeatured: true } });
  await db.productVariant.update({ where: { id: f.fudgyV.id }, data: { sortOrder: 0 } });
  await db.productVariant.create({ data: { productId: f.fudgy.id, sku: "T-FUDGY-500", label: "500 g", priceInPaise: 60_000, stockQuantity: 10, sortOrder: 1 } });
  const { refreshMinPrice } = await import("../../src/lib/product-admin");
  for (const p of [f.fudgy, f.walnut, f.box]) await refreshMinPrice(db, p.id);

  await db.coupon.create({ data: { code: E2E_COUPON, type: "PERCENT", value: 10, description: "E2E test coupon" } });
  for (const [u, role] of [[E2E_ADMIN, "ADMIN"], [E2E_STAFF, "STAFF"], [E2E_CUSTOMER, "CUSTOMER"]] as const) {
    await db.user.create({ data: { email: u.email, name: `E2E ${role.toLowerCase()}`, role, passwordHash: await hashPassword(u.password) } });
  }
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
