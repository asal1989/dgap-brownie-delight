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
  { name: "Fudge", slug: "fudge", description: "Dense, gooey and deeply chocolatey." },
  { name: "Nutella", slug: "nutella", description: "Hazelnut-chocolate indulgence." },
  { name: "Biscoff", slug: "biscoff", description: "Caramelised biscuit meets brownie." },
  { name: "Chocolate Chip", slug: "chocolate-chip", description: "Classic with extra chocolate." },
  { name: "Nuts", slug: "nuts", description: "Brownies with a satisfying crunch." },
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
}

const products: SampleProduct[] = [
  { name: "Classic Fudge Brownie", slug: "classic-fudge-brownie", category: "fudge", price: 99, compareAtPrice: 120, shortDescription: "Rich, fudgy and chocolatey. The one that started it all.", isBestSeller: true, isFeatured: true },
  { name: "Double Chocolate Brownie", slug: "double-chocolate-brownie", category: "fudge", price: 119, shortDescription: "Two kinds of chocolate for a deeper, darker bite.", isBestSeller: true },
  { name: "Nutella Stuffed Brownie", slug: "nutella-stuffed-brownie", category: "nutella", price: 139, compareAtPrice: 159, shortDescription: "A soft brownie with a gooey Nutella centre.", isBestSeller: true },
  { name: "Biscoff Brownie", slug: "biscoff-brownie", category: "biscoff", price: 139, shortDescription: "Brownie topped with caramelised Biscoff crunch.", isBestSeller: true },
  { name: "Chocolate Chip Brownie", slug: "chocolate-chip-brownie", category: "chocolate-chip", price: 109, shortDescription: "Studded with chocolate chips in every bite." },
  { name: "Walnut Brownie", slug: "walnut-brownie", category: "nuts", price: 119, shortDescription: "Fudgy brownie with crunchy walnuts." },
  { name: "Assorted Brownie Box (6)", slug: "assorted-brownie-box-6", category: "assorted-boxes", price: 649, compareAtPrice: 720, shortDescription: "A giftable box of six assorted brownies.", isGiftBox: true, isBestSeller: true },
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

async function main() {
  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
    catIds.set(c.slug, row.id);
  }

  for (const p of products) {
    const categoryId = catIds.get(p.category);
    if (!categoryId) continue;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        sku: `SAMPLE-${p.slug.toUpperCase().slice(0, 24)}`,
        description: `${p.shortDescription}\n\n(Sample product: replace this description in Admin → Products.)`,
        shortDescription: p.shortDescription,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        images: [],
        categoryId,
        isFeatured: p.isFeatured ?? false,
        isBestSeller: p.isBestSeller ?? false,
        isGiftBox: p.isGiftBox ?? false,
        isBoxEligible: !p.isGiftBox,
        isSample: true,
        stock: 25,
      },
    });
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
