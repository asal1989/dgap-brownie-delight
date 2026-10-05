import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/**
 * SAMPLE DATA ONLY. Every product below is flagged isSample=true and shows a "Sample" tag on the site.
 * Prices, names and copy are placeholders: edit or delete them in /admin/products before launch.
 * No reviews, contact details, or policies are seeded.
 */
const categories = [
  { name: "Fudgie", slug: "fudgie", description: "Rich, gooey and deeply chocolatey." },
  { name: "Double Chocolate", slug: "double-chocolate", description: "Two kinds of chocolate, one dark bite." },
  { name: "Nuts", slug: "nuts", description: "Brownies with a satisfying crunch." },
  { name: "Nutella", slug: "nutella", description: "Hazelnut-chocolate indulgence." },
  { name: "Biscoff", slug: "biscoff", description: "Caramelised biscuit meets brownie." },
  { name: "Assorted Boxes", slug: "assorted-boxes", description: "A little of everything, beautifully boxed." },
];

interface SampleProduct {
  name: string;
  slug: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  shortDescription: string;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isGiftBox?: boolean;
  badge?: string;
  sortOrder?: number;
}

const products: SampleProduct[] = [
  { name: "Fudgie Brownie", slug: "fudgie-brownie", category: "fudgie", price: 99, compareAtPrice: 120, shortDescription: "Rich, gooey & deeply chocolatey.", isBestSeller: true, isFeatured: true, badge: "Best seller" },
  { name: "Double Chocolate Brownie", slug: "double-chocolate-brownie", category: "double-chocolate", price: 119, shortDescription: "Two kinds of chocolate for a deeper, darker bite.", isBestSeller: true },
  { name: "Nuts Brownie", slug: "nuts-brownie", category: "nuts", price: 119, shortDescription: "Fudgy brownie with a crunchy, nutty finish.", isBestSeller: true },
  { name: "Nutella Brownie", slug: "nutella-brownie", category: "nutella", price: 139, compareAtPrice: 159, shortDescription: "A soft brownie with a gooey Nutella centre.", isBestSeller: true },
  { name: "Biscoff Brownie", slug: "biscoff-brownie", category: "biscoff", price: 139, shortDescription: "Brownie topped with caramelised Biscoff crunch." },
  { name: "Assorted Brownie Box (6)", slug: "assorted-brownie-box-6", category: "assorted-boxes", price: 649, compareAtPrice: 720, shortDescription: "A giftable box of six assorted brownies.", isGiftBox: true },
  { name: "Assorted Brownie Box (9)", slug: "assorted-brownie-box-9", category: "assorted-boxes", price: 949, shortDescription: "Nine brownies, beautifully boxed for sharing.", isGiftBox: true },
];

const faqQuestions = [
  "How long do brownies stay fresh?",
  "Do you offer eggless brownies?",
  "How should brownies be stored?",
  "Where do you deliver?",
  "Do you offer same-day delivery?",
  "Can I order brownie gift boxes?",
  "Can I place bulk orders?",
];

/** Renames earlier sample rows in place (keeps ids, so existing orders stay linked). */
async function migrateLegacySamples() {
  const catExists = await prisma.category.findUnique({ where: { slug: "fudgie" } });
  if (!catExists) {
    await prisma.category.updateMany({ where: { slug: "fudge" }, data: { slug: "fudgie", name: "Fudgie", description: "Rich, gooey and deeply chocolatey." } });
  }
  const prodRename: Record<string, string> = {
    "classic-fudge-brownie": "fudgie-brownie",
    "nutella-stuffed-brownie": "nutella-brownie",
    "walnut-brownie": "nuts-brownie",
  };
  for (const [old, slug] of Object.entries(prodRename)) {
    const exists = await prisma.product.findUnique({ where: { slug } });
    const row = await prisma.product.findUnique({ where: { slug: old } });
    if (row && row.isSample && !exists) await prisma.product.update({ where: { slug: old }, data: { slug } });
  }
  // The old Chocolate Chip sample is not part of the current range.
  await prisma.product.deleteMany({ where: { slug: "chocolate-chip-brownie", isSample: true } });
  const chip = await prisma.category.findUnique({ where: { slug: "chocolate-chip" }, include: { _count: { select: { products: true } } } });
  if (chip && chip._count.products === 0) await prisma.category.delete({ where: { id: chip.id } });
}

async function main() {
  await migrateLegacySamples();

  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: { sortOrder: i }, create: { ...c, sortOrder: i } });
    catIds.set(c.slug, row.id);
  }

  for (const p of products) {
    const categoryId = catIds.get(p.category);
    if (!categoryId) continue;
    const common = {
      name: p.name,
      shortDescription: p.shortDescription,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      categoryId,
      isFeatured: p.isFeatured ?? false,
      isBestSeller: p.isBestSeller ?? false,
      isGiftBox: p.isGiftBox ?? false,
      isBoxEligible: !p.isGiftBox,
      badge: p.badge ?? null,
      sortOrder: products.indexOf(p),
      description: `${p.shortDescription}\n\n(Sample product: replace this description in Admin → Products.)`,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      // Only refresh rows that are still untouched sample data.
      if (existing.isSample) await prisma.product.update({ where: { id: existing.id }, data: common });
      continue;
    }
    await prisma.product.create({
      data: { ...common, slug: p.slug, sku: `SAMPLE-${p.slug.toUpperCase().slice(0, 24)}`, images: [], isSample: true, stock: 25 },
    });
  }

  // Temporary stock photos (public/images/photos, see CREDITS.md) for SAMPLE rows that are still on placeholder art.
  const art: Record<string, string> = {
    fudgie: "plate-stack", "double-chocolate": "hero-fudgie", nuts: "fudge-stack", nutella: "swirl-rack", biscoff: "golden-stack", "assorted-boxes": "gift-box",
  };
  const isPlaceholder = (u?: string) => !u || u.startsWith("/images/products/") || u.startsWith("/images/photos/");
  for (const [slug, file] of Object.entries(art)) {
    const categoryId = catIds.get(slug);
    if (!categoryId) continue;
    const target = `/images/photos/${file}.jpg`;
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (cat && isPlaceholder(cat.image ?? undefined)) await prisma.category.update({ where: { id: categoryId }, data: { image: target } });
    const rows = await prisma.product.findMany({ where: { categoryId, isSample: true } });
    for (const r of rows) if (isPlaceholder(r.images[0])) await prisma.product.update({ where: { id: r.id }, data: { images: [target] } });
  }

  // FAQs are seeded INACTIVE with empty answers: they never show until you write real answers and activate them.
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: faqQuestions.map((question, i) => ({
        question,
        answer: "Add your answer in Admin → FAQs, then switch this question on.",
        sortOrder: i,
        isActive: false,
      })),
    });
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.customer.upsert({
      where: { email },
      update: { role: "ADMIN", passwordHash },
      create: { name: "Admin", email, passwordHash, role: "ADMIN" },
    });
    console.log(`Admin ready: ${email}`);
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin user created.");
  }
  console.log("Seed complete (sample data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
