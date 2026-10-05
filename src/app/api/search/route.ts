import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const rl = rateLimit(`search:${await clientIp()}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ results: [] }, { status: 429 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const items = await prisma.product.findMany({
    where: {
      isActive: true,
      category: { isActive: true },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { category: { select: { name: true } } },
    take: 6,
    orderBy: { isBestSeller: "desc" },
  });
  return NextResponse.json({
    results: items.map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      image: p.images[0] ?? null,
      category: p.category.name,
    })),
  });
}
