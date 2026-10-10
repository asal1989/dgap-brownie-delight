/**
 * Catalogue seed. Safe to run repeatedly (upserts by slug / SKU).
 *
 *   npm run db:seed            base catalogue only: SAFE for production
 *   npm run db:seed -- --dev   also opens the shop for development (see below)
 *
 * What it will NEVER do: invent prices, stock, orders or reviews. Every brownie is created with
 * "price not configured" and must be priced by an admin. The only known price is the assorted-brownies
 * offer (1 kg for Rs 1,000), which is created as a DRAFT for an admin to confirm and activate.
 */
import "dotenv/config";
import { hashPassword } from "../src/lib/auth/password";
import { db } from "../src/lib/db";
import { refreshMinPrice } from "../src/lib/product-admin";
import { saveSettings } from "../src/lib/settings";

const dev = process.argv.includes("--dev");

const categories = [
  { slug: "classic-fudgy-brownie", name: "Classic Fudgy Brownie", description: "The one that started it all: dense, fudgy and deeply chocolatey." },
  { slug: "double-chocolate-brownie", name: "Double Chocolate Brownie", description: "Twice the chocolate for a deeper, richer bite." },
  { slug: "triple-chocolate-brownie", name: "Triple Chocolate Brownie", description: "Three layers of chocolate indulgence in one brownie." },
  { slug: "chocolate-walnut-brownie", name: "Chocolate Walnut Brownie", description: "Fudgy chocolate with a satisfying walnut crunch." },
  { slug: "ragi-brownie", name: "Ragi Brownie", description: "A chocolate brownie made with ragi (finger millet) flour." },
  { slug: "wheat-brownie", name: "Wheat Brownie", description: "A chocolate brownie made with wheat flour." },
  { slug: "assorted-brownie-boxes", name: "Assorted Brownie Boxes", description: "A selection of our brownies in one box." },
  { slug: "gift-boxes", name: "Gift Boxes", description: "Brownies, packed to be gifted." },
];

type Seed = {
  slug: string; name: string; category: string; short: string; description: string; skuPrefix: string;
  images: [string, string][]; labels?: string[]; allergens?: string; bestseller?: boolean; featured?: boolean;
};

const flavours: Seed[] = [
  {
    slug: "classic-fudgy-brownie", name: "Classic Fudgy Brownie", category: "classic-fudgy-brownie", skuPrefix: "CFB",
    short: "The one that started it all: dense, fudgy and deeply chocolatey.",
    description: "Our signature chocolate brownie with a rich, fudgy centre and a crackly top. Simple, indulgent and made for chocolate lovers.",
    images: [["classic-fudgy.jpg", "Freshly baked classic fudgy brownies with crackly tops on baking paper"], ["plate-stack.jpg", "Stack of fudgy chocolate brownies on a plate"]],
    bestseller: true, featured: true,
  },
  {
    slug: "double-chocolate-brownie", name: "Double Chocolate Brownie", category: "double-chocolate-brownie", skuPrefix: "DCB",
    short: "Twice the chocolate for a deeper, richer bite.",
    description: "A brownie built for serious chocolate fans, with a double dose of chocolate in every bite.",
    images: [["double-chocolate.jpg", "Chocolate brownies drizzled with chocolate"], ["hero-fudgie.jpg", "Close-up of a rich fudgy chocolate brownie"]],
    bestseller: true,
  },
  {
    slug: "triple-chocolate-brownie", name: "Triple Chocolate Brownie", category: "triple-chocolate-brownie", skuPrefix: "TCB",
    short: "Three layers of chocolate indulgence in one brownie.",
    description: "For the ultimate chocolate craving: a triple chocolate brownie that is rich, glossy and unapologetically decadent.",
    images: [["triple-chocolate.jpg", "Stack of brownies with chocolate sauce pouring over"], ["swirl-rack.jpg", "Glossy chocolate brownies cooling on a rack"]],
    bestseller: true,
  },
  {
    slug: "chocolate-walnut-brownie", name: "Chocolate Walnut Brownie", category: "chocolate-walnut-brownie", skuPrefix: "CWB",
    short: "Fudgy chocolate brownie with a satisfying walnut crunch.",
    description: "A rich chocolate brownie paired with walnuts for a contrast of fudgy and crunchy. Contains nuts.",
    images: [["walnut.jpg", "Chocolate brownie topped with a walnut half"], ["walnut-stack.jpg", "Stack of brownies topped with chopped walnuts"]],
    labels: ["Contains nuts"], allergens: "Contains walnuts (tree nuts).",
  },
  {
    slug: "ragi-brownie", name: "Ragi Brownie", category: "ragi-brownie", skuPrefix: "RGB",
    short: "A brownie made with ragi (finger millet) flour.",
    description: "A chocolate brownie made with ragi, for a rustic twist on a favourite treat.",
    images: [["ragi.jpg", "Two dark chocolate brownies on a green plate"], ["fudge-stack.jpg", "Dense, dark brownie squares stacked together"]],
  },
  {
    slug: "wheat-brownie", name: "Wheat Brownie", category: "wheat-brownie", skuPrefix: "WHB",
    short: "A brownie made with wheat flour.",
    description: "A chocolate brownie made with wheat flour, for a slightly different bite with the same chocolate comfort.",
    images: [["wheat.jpg", "Pile of freshly baked brownies on a table"], ["golden-stack.jpg", "Golden-topped brownies stacked high"]],
  },
];

async function upsertProduct(s: Seed, i: number) {
  const category = await db.category.findUniqueOrThrow({ where: { slug: s.category } });
  const product = await db.product.upsert({
    where: { slug: s.slug },
    create: {
      slug: s.slug, name: s.name, shortDescription: s.short, description: s.description, status: "ACTIVE",
      categoryId: category.id, dietaryLabels: s.labels ?? [], allergens: s.allergens ?? null,
      isBestseller: s.bestseller ?? false, isFeatured: s.featured ?? false, boxSelectable: true, sortOrder: i,
    },
    update: {},
  });
  if ((await db.productImage.count({ where: { productId: product.id } })) === 0) {
    await db.productImage.createMany({
      data: s.images.map(([file, alt], n) => ({ productId: product.id, url: `/images/${file}`, alt, sortOrder: n })),
    });
  }
  // Placeholder sizes carried over from the previous site. Prices are NOT configured: admin must set them.
  const sizes = [["Single piece", 1], ["Box of 4", 4], ["Box of 6", 6]] as const;
  for (const [n, [label, pieces]] of sizes.entries()) {
    await db.productVariant.upsert({
      where: { sku: `DGAP-${s.skuPrefix}-${pieces}` },
      create: { productId: product.id, sku: `DGAP-${s.skuPrefix}-${pieces}`, label, pieces, priceInPaise: null, trackInventory: false, stockQuantity: 0, sortOrder: n },
      update: {},
    });
  }
  await refreshMinPrice(db, product.id);
}

async function main() {
  for (const [i, c] of categories.entries()) {
    await db.category.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: {} });
  }
  for (const [i, f] of flavours.entries()) await upsertProduct(f, i);

  // Known initial offer: assorted brownies, 1 kg for Rs 1,000. DRAFT until an admin confirms it.
  const boxesCat = await db.category.findUniqueOrThrow({ where: { slug: "assorted-brownie-boxes" } });
  const assorted = await db.product.upsert({
    where: { slug: "assorted-brownies" },
    create: {
      slug: "assorted-brownies", name: "Assorted Brownies", status: "DRAFT", categoryId: boxesCat.id, sortOrder: 10,
      shortDescription: "A mixed selection of our brownies, packed by weight.",
      description: "A generous mix of our handcrafted brownies. The flavours in each box are confirmed when you order.",
    },
    update: {},
  });
  if ((await db.productImage.count({ where: { productId: assorted.id } })) === 0) {
    await db.productImage.create({ data: { productId: assorted.id, url: "/images/tray.jpg", alt: "A tray of freshly baked brownies", sortOrder: 0 } });
  }
  await db.productVariant.upsert({
    where: { sku: "DGAP-ASSORTED-1KG" },
    create: { productId: assorted.id, sku: "DGAP-ASSORTED-1KG", label: "1 kg", weightGrams: 1000, priceInPaise: 100_000, trackInventory: false },
    update: {},
  });
  await refreshMinPrice(db, assorted.id);

  // Custom box product: sizes are placeholders and unpriced until an admin configures them.
  const box = await db.product.upsert({
    where: { slug: "build-your-own-box" },
    create: {
      slug: "build-your-own-box", name: "Build Your Own Box", kind: "CUSTOM_BOX", status: "ACTIVE", categoryId: boxesCat.id, sortOrder: 11,
      shortDescription: "Choose a box size and fill it with your favourite brownies.",
      description: "Pick a box size, then choose the flavours you love. Your selection is saved with your order.",
    },
    update: {},
  });
  if ((await db.productImage.count({ where: { productId: box.id } })) === 0) {
    await db.productImage.create({ data: { productId: box.id, url: "/images/gift-box.jpg", alt: "A gift box of brownies", sortOrder: 0 } });
  }
  for (const [n, pieces] of [4, 6, 9].entries()) {
    await db.productVariant.upsert({
      where: { sku: `DGAP-BOX-${pieces}` },
      create: { productId: box.id, sku: `DGAP-BOX-${pieces}`, label: `Box of ${pieces}`, pieces, priceInPaise: null, trackInventory: false, sortOrder: n },
      update: {},
    });
  }
  await refreshMinPrice(db, box.id);

  if (dev) await devExtras();
  console.log(`Seeded ${categories.length} categories and ${flavours.length + 2} products${dev ? " (+ development extras)" : ""}.`);
}

/** Development conveniences. Refused when NODE_ENV=production. */
async function devExtras() {
  if (process.env.NODE_ENV === "production") throw new Error("--dev seeding is not allowed in production");
  await db.product.update({ where: { slug: "assorted-brownies" }, data: { status: "ACTIVE", isFeatured: false } });
  await db.product.update({ where: { slug: "assorted-brownies" }, data: { isBestseller: true } });
  const assorted = await db.product.findUniqueOrThrow({ where: { slug: "assorted-brownies" } });
  await refreshMinPrice(db, assorted.id);
  await saveSettings({ orderingEnabled: true, codEnabled: true }, null);
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    create: { code: "WELCOME10", type: "PERCENT", value: 10, description: "Development coupon" },
    update: {},
  });
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await db.user.upsert({
      where: { email },
      create: { email, name: "Development Admin", role: "ADMIN", passwordHash: await hashPassword(password) },
      update: {},
    });
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
