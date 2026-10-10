import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGridList } from "@/components/store/product-card";
import { ProductPurchase, type PurchaseVariant } from "@/components/store/product-purchase";
import { Reveal } from "@/components/ui/reveal";
import { jsonLdString, productJsonLd } from "@/lib/seo";
import { getProductBySlug, getProductReviews, getRelatedProducts, isPurchasable } from "@/lib/store-queries";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const title = p.seoTitle || p.name;
  const description = p.seoDescription || p.shortDescription;
  return {
    title,
    description,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title, description, type: "website", images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([getRelatedProducts(product.id, product.categoryId), getProductReviews(product.id)]);

  const variants: PurchaseVariant[] = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    pricePaise: v.priceInPaise,
    comparePaise: v.compareAtPriceInPaise,
    purchasable: isPurchasable(v),
    stockNote: v.priceInPaise != null && v.trackInventory && v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold ? `Only ${v.stockQuantity} left` : v.priceInPaise != null && !isPurchasable(v) ? "Sold out" : null,
  }));
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(product)) }} />
      <div className="container-x py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-[0.16em] text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/shop" className="hover:text-forest">Shop</Link></li>
            {product.category && (<><li aria-hidden>/</li><li><Link href={`/categories/${product.category.slug}`} className="hover:text-forest">{product.category.name}</Link></li></>)}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-forest">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} name={product.name} />

          <div>
            {product.isBestseller && <p className="badge mb-4">Bestseller</p>}
            <h1 className="text-[clamp(2.4rem,5vw,3.8rem)]">{product.name}</h1>
            {avg != null && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted" aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${reviews.length} reviews`}>
                <Star size={16} className="fill-gold text-gold" aria-hidden /> {avg.toFixed(1)} ({reviews.length})
              </p>
            )}
            <span className="rule-gold my-6" aria-hidden />
            <p className="text-lg text-muted">{product.description}</p>
            {product.dietaryLabels.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Dietary information">
                {product.dietaryLabels.map((l) => <li key={l} className="badge">{l}</li>)}
              </ul>
            )}

            <div className="mt-9 border-t border-line pt-8">
              {product.kind === "CUSTOM_BOX" ? (
                <div>
                  <p className="text-muted">This is a customisable box. Pick your size and flavours in the box builder.</p>
                  <Link href="/build-your-box" className="btn btn-primary btn-lg mt-5">Build your box</Link>
                </div>
              ) : (
                <ProductPurchase slug={product.slug} name={product.name} image={product.images[0]?.url ?? null} variants={variants} />
              )}
            </div>

            <dl className="mt-10 space-y-5 border-t border-line pt-8 text-sm">
              <div>
                <dt className="eyebrow mb-1">Ingredients</dt>
                <dd className="text-muted">{product.ingredients || "The full ingredient list is available on request. Please ask us before you order."}</dd>
              </div>
              <div>
                <dt className="eyebrow mb-1">Allergens</dt>
                <dd className="text-muted">{product.allergens || "Allergen details are confirmed on request. If you have an allergy, please ask us before ordering."}</dd>
              </div>
            </dl>
          </div>
        </div>

        {reviews.length > 0 && (
          <section aria-labelledby="reviews-title" className="mt-24 border-t border-line pt-14">
            <h2 id="reviews-title" className="mb-8 text-4xl">Reviews</h2>
            <ul className="grid gap-6 md:grid-cols-2">
              {reviews.map((r) => (
                <li key={r.id} className="card-line p-6">
                  <p className="text-gold-deep" role="img" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                  {r.title && <h3 className="mt-2 text-xl">{r.title}</h3>}
                  <p className="mt-2 text-muted">{r.body}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em]">{r.authorName}{r.verifiedPurchase ? " · Verified purchase" : ""}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-24 border-t border-line pt-14">
            <Reveal><h2 id="related-title" className="mb-10 text-center text-4xl">You may also enjoy</h2></Reveal>
            <ProductGridList products={related.slice(0, 3)} />
          </section>
        )}
      </div>
    </>
  );
}
