import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/config";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/queries";
import { Breadcrumbs } from "@/components/layout/page-header";
import { ProductGallery } from "@/components/shop/product-gallery";
import { StickyBuyBar } from "@/components/shop/sticky-buy-bar";
import { ReviewForm } from "@/components/shop/review-form";
import { ReviewCard } from "@/components/shop/review-card";
import { ProductGrid } from "@/components/shop/product-grid";
import { ProductPurchase } from "@/components/cart/add-to-cart";
import { Badge, PriceDisplay, RatingStars, SectionHeading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/json-ld";
import { buildOrderMessage, whatsappLink } from "@/lib/whatsapp";
import { siteUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const description = p.shortDescription ?? p.description.slice(0, 155);
  const image = p.images[0];
  return {
    title: p.name,
    description,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { type: "website", title: p.name, description, url: siteUrl(`/shop/${p.slug}`), ...(image ? { images: [{ url: image, alt: p.name }] } : {}) },
    twitter: { card: "summary_large_image", title: p.name, description },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, s] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();
  const related = await getRelatedProducts(product.id, product.categoryId);

  const count = product.reviews.length;
  const avg = count ? product.reviews.reduce((n, r) => n + r.rating, 0) / count : null;
  const waHref = s.whatsappDigits
    ? whatsappLink(s.whatsappDigits, buildOrderMessage(s.brandName, [{ name: product.name, quantity: 1 }], product.price))
    : null;
  const cartProduct = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.images[0] ?? null,
    stock: product.stock,
  };

  const details = [
    { title: "Ingredients", body: product.ingredients },
    { title: "Allergen information", body: product.allergens },
    { title: "Storage", body: product.storage },
    {
      title: "Delivery",
      body: product.deliveryInfo || [s.deliveryAreas && `We deliver to: ${s.deliveryAreas}`, s.expectedDelivery].filter(Boolean).join("\n"),
    },
  ].filter((d) => d.body);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku ?? undefined,
    image: product.images.map((i) => (i.startsWith("http") ? i : siteUrl(i))),
    brand: { "@type": "Brand", name: s.brandName },
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url: siteUrl(`/shop/${product.slug}`),
      priceCurrency: "INR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(avg ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: count } } : {}),
  };

  return (
    <div className="pb-24 lg:pb-0">
      <JsonLd data={ld} />
      <div className="container-page pt-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: product.category.name, href: `/categories/${product.category.slug}` },
            { label: product.name },
          ]}
        />
      </div>

      <section className="container-page grid gap-10 py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <div className="flex flex-wrap gap-2">
            {product.isBestSeller ? <Badge tone="gold">Best seller</Badge> : null}
            {product.isSample ? <Badge tone="light">Sample product</Badge> : null}
          </div>
          <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight text-choc sm:text-5xl">{product.name}</h1>
          <div className="mt-3">
            <RatingStars rating={avg ? Math.round(avg * 10) / 10 : null} count={count} size="md" />
          </div>
          <div className="mt-5">
            <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          </div>
          <p className="mt-5 whitespace-pre-line text-pretty text-lg text-ink/75">{product.description}</p>
          <ProductPurchase product={cartProduct} className="mt-8" />
          {waHref ? (
            <ButtonLink href={waHref} external variant="outline" size="lg" className="mt-3 w-full">
              <MessageCircle className="size-5" aria-hidden /> Order on WhatsApp
            </ButtonLink>
          ) : null}
          {product.sku ? <p className="mt-6 text-xs text-ink/70">SKU: {product.sku}</p> : null}

          {details.length ? (
            <div className="mt-8 divide-y divide-beige rounded-3xl border border-beige bg-white">
              {details.map((d, i) => (
                <details key={d.title} className="group px-5" open={i === 0}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-semibold text-choc [&::-webkit-details-marker]:hidden">
                    {d.title}
                    <span className="text-caramel transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="whitespace-pre-line pb-4 text-ink/75">{d.body}</p>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="container-page py-12" aria-labelledby="reviews-h">
        <SectionHeading align="left" title={<span id="reviews-h">Customer reviews</span>} />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_24rem]">
          {count ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {product.reviews.map((r) => (
                <li key={r.id}>
                  <ReviewCard name={r.customerName} rating={r.rating} text={r.review} date={r.createdAt} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed border-beige p-8 text-ink/70">No reviews yet. Be the first to share how it tasted.</p>
          )}
          <ReviewForm productId={product.id} />
        </div>
      </section>

      {related.length ? (
        <section className="container-page py-12" aria-labelledby="related-h">
          <SectionHeading align="left" title={<span id="related-h">You may also like</span>} />
          <div className="mt-8">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}

      <StickyBuyBar product={cartProduct} whatsappHref={waHref} />
    </div>
  );
}
