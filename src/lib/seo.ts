import type { StoreProduct } from "./store-queries";
import { isPurchasable } from "./store-queries";
import { siteUrl } from "./env";
import type { Settings } from "./settings";

const abs = (path: string) => (path.startsWith("http") ? path : `${siteUrl()}${path}`);

/** Product structured data using only verified, configured prices and real stock state. */
export function productJsonLd(p: StoreProduct) {
  const priced = p.variants.filter((v) => v.priceInPaise != null && v.isAvailable);
  const offers = priced.map((v) => ({
    "@type": "Offer",
    sku: v.sku,
    name: v.label,
    priceCurrency: "INR",
    price: (v.priceInPaise! / 100).toFixed(2),
    availability: isPurchasable(v) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: abs(`/shop/${p.slug}`),
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription,
    image: p.images.map((i) => abs(i.url)),
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: "DGAP Brownie Delight" },
    ...(offers.length ? { offers: offers.length === 1 ? offers[0] : offers } : {}),
  };
}

/** Bakery/organisation data containing only details the business has configured. */
export function bakeryJsonLd(s: Settings) {
  const sameAs = [s.instagramUrl, s.facebookUrl].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: s.businessName,
    description: s.tagline,
    url: siteUrl(),
    logo: abs(s.logoUrl),
    areaServed: "Bangalore",
    ...(s.contactEmail ? { email: s.contactEmail } : {}),
    ...(s.contactPhone ? { telephone: s.contactPhone } : {}),
    ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "IN" } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** Safe inline JSON-LD: `<` is escaped so a stray `</script>` in data cannot break out. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
