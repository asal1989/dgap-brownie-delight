import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductGridList } from "@/components/store/product-card";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { PageHero, SectionHeading } from "@/components/ui/section";
import { db } from "@/lib/db";
import { getSettings, resolveWhatsAppNumber } from "@/lib/settings";
import { toCard } from "@/lib/store-queries";
import { whatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Brownie gift boxes",
  description: "Beautifully packed DGAP brownie gift boxes for birthdays, festivals, thank-yous and celebrations.",
  alternates: { canonical: "/gift-boxes" },
};

const OCCASIONS = ["Birthdays", "Anniversaries", "Festivals", "Corporate gifting", "Thank-yous"] as const;

export default async function GiftBoxesPage() {
  const settings = await getSettings();
  const gifts = await db.product.findMany({
    where: { status: "ACTIVE", category: { slug: "gift-boxes" } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }, category: true },
  });
  const number = resolveWhatsAppNumber(settings);
  const enquiry = (occasion?: string) =>
    whatsAppUrl(number, `Hello ${settings.businessName}! This is an enquiry, not an order. I would like to know about your brownie gift boxes${occasion ? ` for ${occasion.toLowerCase()}` : ""}.`);

  return (
    <>
      <PageHero eyebrow="Luxury gifting" title="Brownies, beautifully gifted" sub="Thoughtfully packed for the moments worth marking." />
      <div className="container-x py-20">
        {gifts.length > 0 ? (
          <>
            <SectionHeading eyebrow="Gift boxes" title="Choose a box" />
            <ProductGridList products={gifts.map(toCard)} priorityCount={3} />
          </>
        ) : (
          <Reveal className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
            <div className="relative aspect-[5/4] overflow-hidden bg-forest"><Image src="/images/gift-box.jpg" alt="A gift box" fill priority sizes="(min-width: 768px) 45vw, 92vw" className="object-cover" /></div>
            <div>
              <p className="eyebrow mb-3">Coming together</p>
              <h2 className="text-5xl">Our gift boxes are being curated</h2>
              <span className="rule-gold my-6" aria-hidden />
              <p className="text-lg text-muted">In the meantime, build a custom box of your favourite brownies, or tell us the occasion and we will help you choose.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/build-your-box" className="btn btn-primary">Build your box</Link>
                {enquiry() && <a href={enquiry()!} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><WhatsAppIcon width={18} height={18} /> Enquire on WhatsApp</a>}
              </div>
            </div>
          </Reveal>
        )}
      </div>

      <section className="bg-ivory-deep py-20" aria-labelledby="occ-title">
        <div className="container-x">
          <SectionHeading eyebrow="For every occasion" id="occ-title" title="Planning a gift?" sub="Tell us the occasion and the date, and we will confirm what we can do." />
          <ul className="flex flex-wrap justify-center gap-3">
            {OCCASIONS.map((o) => (
              <li key={o}>
                {enquiry(o) ? <a href={enquiry(o)!} target="_blank" rel="noopener noreferrer" className="btn btn-outline">{o}</a> : <Link href="/contact" className="btn btn-outline">{o}</Link>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
