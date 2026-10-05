import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { BottomCartBar } from "@/components/cart/bottom-cart-bar";
import { JsonLd } from "@/components/ui/json-ld";
import { getSettings } from "@/lib/config";
import { siteUrl } from "@/lib/utils";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const sameAs = [s.instagram, s.facebook].filter(Boolean);
  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: s.brandName,
    url: siteUrl(),
    description: s.seoDescription,
    ...(s.logo ? { logo: s.logo.startsWith("http") ? s.logo : siteUrl(s.logo) } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "IN" } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(s.fssai ? { identifier: `FSSAI ${s.fssai}` } : {}),
  };
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-choc px-5 py-3 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <JsonLd data={org} />
      <Navbar brandName={s.brandName} logo={s.logo} />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <BottomCartBar />
      <WhatsAppFloat />
    </>
  );
}
