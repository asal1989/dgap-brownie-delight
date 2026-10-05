import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/config";
import {
  getActiveCategories,
  getApprovedReviews,
  getBestSellers,
  getBoxProducts,
  getFaqs,
  getSignatureProduct,
  searchProducts,
} from "@/lib/db/queries";
import { FinalCta, GiftingSection, Hero, InstagramSection, SignatureSection, TrustBar, WhyDgap } from "@/components/home/sections";
import { BoxBuilder } from "@/components/home/box-builder";
import { ProductCard } from "@/components/shop/product-card";
import { CategoryCard } from "@/components/shop/category-card";
import { ReviewCard } from "@/components/shop/review-card";
import { FAQ } from "@/components/ui/faq";
import { ScrollRow } from "@/components/ui/scroll-row";
import { SectionHeading, EmptyState } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { absolute: s.seoTitle }, description: s.seoDescription, alternates: { canonical: "/" } };
}

export default async function HomePage() {
  const [s, bestRaw, categories, reviews, faqs, boxProducts] = await Promise.all([
    getSettings(),
    getBestSellers(8),
    getActiveCategories(),
    getApprovedReviews(10),
    getFaqs(),
    getBoxProducts(),
  ]);
  const best = (bestRaw.length ? bestRaw : (await searchProducts({ pageSize: 8 })).products).slice(0, 8);
  const signature = await getSignatureProduct(s.signatureProductSlug);

  return (
    <>
      <Hero s={s} />
      <TrustBar />

      <section className="section container-page" aria-labelledby="best-title">
        <Reveal>
          <SectionHeading
            eyebrow="Best sellers"
            title={<span id="best-title">Meet Your New Favorite Brownies</span>}
            subtitle="Rich, fudgy and baked fresh for every craving."
          />
        </Reveal>
        <div className="mt-12 lg:mt-16">
          {best.length ? (
            <ScrollRow label="best selling brownies" gridClass="lg:grid-cols-4 lg:gap-6">
              {best.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 2} />
              ))}
            </ScrollRow>
          ) : (
            <EmptyState title="Our menu is being prepared" text="Fresh brownies will appear here very soon." />
          )}
        </div>
        {best.length ? (
          <div className="mt-8 text-center">
            <Link href="/shop" className="inline-flex min-h-12 items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-heading underline-offset-8 hover:underline">
              View all brownies <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        ) : null}
      </section>

      {categories.length ? (
        <section className="section bg-panel2/40" aria-labelledby="cat-title">
          <div className="container-page">
            <Reveal>
              <SectionHeading eyebrow="Shop by flavour" title={<span id="cat-title">Find Your Flavour</span>} subtitle="From classic fudge to loaded favourites." />
            </Reveal>
            <div className="mt-12 lg:mt-16">
              <ScrollRow label="brownie flavours" gridClass="lg:grid-cols-6 lg:gap-5" itemClass="w-[44%] sm:w-[28%]">
                {categories.map((c) => (
                  <CategoryCard key={c.id} name={c.name} slug={c.slug} image={c.image} description={c.description} />
                ))}
              </ScrollRow>
            </div>
          </div>
        </section>
      ) : null}

      {signature ? <SignatureSection s={s} product={signature} /> : null}

      <WhyDgap />

      {boxProducts.length ? (
        <section className="section bg-panel2/40" aria-labelledby="box-title">
          <div className="container-page">
            <Reveal>
              <SectionHeading
                eyebrow="Build your box"
                title={<span id="box-title">Build Your Perfect Brownie Box</span>}
                subtitle="Pick a size, mix your favourite flavours, and watch your total update live."
              />
            </Reveal>
            <div className="mt-12">
              <BoxBuilder products={boxProducts} />
            </div>
          </div>
        </section>
      ) : null}

      <GiftingSection />

      {reviews.length ? (
        <section className="section container-page" aria-labelledby="reviews-title">
          <Reveal>
            <SectionHeading eyebrow="Reviews" title={<span id="reviews-title">Loved By Brownie Lovers</span>} />
          </Reveal>
          <div className="mt-12">
            <ScrollRow label="customer reviews" desktop="carousel" arrows itemClass="w-[88%] sm:w-[46%] lg:w-[31.5%]">
              {reviews.map((r) => (
                <ReviewCard key={r.id} name={r.customerName} rating={r.rating} text={r.review} productName={r.product.name} date={r.createdAt} />
              ))}
            </ScrollRow>
          </div>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="section container-page pt-0" aria-labelledby="faq-title">
          <Reveal>
            <SectionHeading eyebrow="Questions" title={<span id="faq-title">Good To Know</span>} />
          </Reveal>
          <div className="mt-12">
            <FAQ items={faqs.slice(0, 8).map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          </div>
        </section>
      ) : null}

      {s.instagram ? <InstagramSection url={s.instagram} /> : null}
      <FinalCta s={s} />
    </>
  );
}
