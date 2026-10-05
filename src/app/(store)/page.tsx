import type { Metadata } from "next";
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
import { ProductGrid } from "@/components/shop/product-grid";
import { CategoryCard } from "@/components/shop/category-card";
import { ReviewCard } from "@/components/shop/review-card";
import { FAQ } from "@/components/ui/faq";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading, EmptyState } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { absolute: s.seoTitle }, description: s.seoDescription, alternates: { canonical: "/" } };
}

export default async function HomePage() {
  const [s, bestRaw, categories, reviews, faqs, boxProducts] = await Promise.all([
    getSettings(),
    getBestSellers(6),
    getActiveCategories(),
    getApprovedReviews(6),
    getFaqs(),
    getBoxProducts(),
  ]);
  const best = bestRaw.length ? bestRaw : (await searchProducts({ pageSize: 6 })).products;
  const signature = await getSignatureProduct(s.signatureProductSlug);

  return (
    <>
      <Hero s={s} />
      <TrustBar />

      <section className="container-page py-20 lg:py-28" aria-labelledby="best-title">
        <Reveal>
          <SectionHeading
            eyebrow="Best sellers"
            title={<span id="best-title">Meet Your New Favorite Brownies</span>}
            subtitle="Handpicked favorites for serious chocolate lovers."
          />
        </Reveal>
        <div className="mt-12">
          {best.length ? (
            <ProductGrid products={best} />
          ) : (
            <EmptyState title="Our menu is being prepared" text="Fresh brownies will appear here very soon." />
          )}
        </div>
        {best.length ? (
          <div className="mt-10 text-center">
            <ButtonLink href="/shop" variant="outline" size="lg">View all brownies</ButtonLink>
          </div>
        ) : null}
      </section>

      {categories.length ? (
        <section className="bg-beige/40 py-20 lg:py-24" aria-labelledby="cat-title">
          <div className="container-page">
            <Reveal>
              <SectionHeading eyebrow="Explore" title={<span id="cat-title">Find Your Flavour</span>} subtitle="From classic fudge to loaded favourites." />
            </Reveal>
            <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
              {categories.map((c) => (
                <li key={c.id}>
                  <CategoryCard name={c.name} slug={c.slug} image={c.image} description={c.description} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {signature ? <SignatureSection s={s} product={signature} /> : null}

      <WhyDgap />

      {boxProducts.length ? (
        <section className="bg-beige/40 py-20 lg:py-24" aria-labelledby="box-title">
          <div className="container-page">
            <Reveal>
              <SectionHeading
                eyebrow="Build your box"
                title={<span id="box-title">Create Your Perfect Brownie Box</span>}
                subtitle="Pick a size, mix your favourite flavours and we will price it live."
              />
            </Reveal>
            <div className="mt-10">
              <BoxBuilder products={boxProducts} />
            </div>
          </div>
        </section>
      ) : null}

      <GiftingSection />

      {reviews.length ? (
        <section className="container-page pb-20 lg:pb-28" aria-labelledby="reviews-title">
          <Reveal>
            <SectionHeading eyebrow="Reviews" title={<span id="reviews-title">Loved By Brownie Lovers</span>} />
          </Reveal>
          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard name={r.customerName} rating={r.rating} text={r.review} productName={r.product.name} date={r.createdAt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="container-page pb-20 lg:pb-28" aria-labelledby="faq-title">
          <Reveal>
            <SectionHeading eyebrow="Questions" title={<span id="faq-title">Good To Know</span>} />
          </Reveal>
          <div className="mt-10">
            <FAQ items={faqs.slice(0, 7).map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          </div>
        </section>
      ) : null}

      {s.instagram ? <InstagramSection url={s.instagram} /> : null}
      <FinalCta s={s} />
    </>
  );
}
