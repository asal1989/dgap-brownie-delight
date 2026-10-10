import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { saveSettings } from "@/lib/settings";
import type { CheckoutInput } from "@/lib/checkout-schema";
import type { CartInput } from "@/lib/quote";

/** Empty every table (except Prisma's migration ledger). Test database only. */
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) throw new Error("resetDb refused: not a test database");
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export type Fixture = Awaited<ReturnType<typeof seedCatalog>>;

/**
 * A small catalogue with clearly TEST prices (these tests never touch real data):
 *  - Fudgy: Rs 1,000, 10 in stock       - Walnut: Rs 600, 10 in stock
 *  - Box of 4: Rs 400, 5 in stock       - Unpriced: no price configured
 */
export async function seedCatalog(opts: { settings?: Parameters<typeof saveSettings>[0] } = {}) {
  await saveSettings(
    {
      orderingEnabled: true,
      codEnabled: true,
      deliveryOptions: [{ id: "standard", label: "Standard delivery", description: "", feePaise: 5_000, enabled: true }],
      ...opts.settings,
    },
    null,
  );
  const category = await db.category.create({ data: { slug: "brownies", name: "Brownies" } });
  const mk = (slug: string, name: string, extra: object = {}) =>
    db.product.create({
      data: { slug, name, shortDescription: `${name} short`, description: `${name} long`, status: "ACTIVE", categoryId: category.id, boxSelectable: true, ...extra },
    });
  const fudgy = await mk("fudgy", "Classic Fudgy Brownie");
  const walnut = await mk("walnut", "Chocolate Walnut Brownie");
  const unpriced = await mk("unpriced", "Ragi Brownie");
  const box = await mk("box", "Build Your Box", { kind: "CUSTOM_BOX", boxSelectable: false });

  const v = (productId: string, sku: string, label: string, price: number | null, stock: number, extra: object = {}) =>
    db.productVariant.create({ data: { productId, sku, label, priceInPaise: price, stockQuantity: stock, ...extra } });
  const fudgyV = await v(fudgy.id, "T-FUDGY-1KG", "1 kg", 100_000, 10);
  const walnutV = await v(walnut.id, "T-WALNUT-1KG", "1 kg", 60_000, 10);
  const unpricedV = await v(unpriced.id, "T-RAGI", "Single", null, 10);
  const boxV = await v(box.id, "T-BOX-4", "Box of 4", 40_000, 5, { pieces: 4 });

  return { category, fudgy, walnut, unpriced, box, fudgyV, walnutV, unpricedV, boxV };
}

export const checkout = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  customerName: "Test Customer",
  customerEmail: "customer@example.test",
  customerPhone: "919876543210",
  recipientName: "",
  recipientPhone: "",
  line1: "12 Test Street",
  line2: "",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  deliveryNote: "",
  giftMessage: "",
  deliveryOptionId: "standard",
  paymentMethod: "ONLINE",
  idempotencyKey: randomUUID(),
  ...over,
});

export const cartOf = (variantId: string, quantity = 1, couponCode?: string): CartInput => ({
  items: [{ type: "product", variantId, quantity }],
  couponCode,
});

export async function makeUser(role: "CUSTOMER" | "STAFF" | "ADMIN" = "CUSTOMER", email = `${role.toLowerCase()}-${randomUUID().slice(0, 6)}@example.test`) {
  return db.user.create({ data: { email, name: `${role} User`, passwordHash: "x", role } });
}

export const stockOf = async (variantId: string) => (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;
