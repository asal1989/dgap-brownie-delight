import Link from "next/link";
import { ChefHat, Flame, Gem, Gift, Heart, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { Instagram } from "@/components/ui/social-icons";
import { ButtonLink } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { buildEnquiryMessage, whatsappLink } from "@/lib/whatsapp";
import { formatINR } from "@/lib/utils";
import type { SiteSettings } from "@/lib/config";

export function Hero({ s }: { s: SiteSettings }) {
  return (
    <section className="relative overflow-hidden bg-cream" aria-labelledby="hero-title">
      <div className="container-page grid items-center gap-10 pb-14 pt-8 lg:min-h-[44rem] lg:grid-cols-2 lg:gap-6 lg:pb-20 lg:pt-10">
        <div className="animate-fade-up order-2 lg:order-1">
          <Badge tone="dark" className="mb-6">Freshly baked • Premium ingredients</Badge>
          <h1 id="hero-title" className="text-balance text-[2.9rem] font-semibold leading-[1.02] text-choc sm:text-6xl lg:text-7xl">
            Brownies Worth <span className="block italic text-caramel">Craving.</span>
          </h1>
          <p className="mt-6 max-w-lg text-pretty text-lg text-ink/75 sm:text-xl">
            Rich, fudgy brownies baked in small batches and made for your sweetest moments.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" size="lg">Shop brownies</ButtonLink>
            {s.whatsappDigits ? (
              <ButtonLink
                href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName, "I'd like to order brownies."))}
                external
                variant="outline"
                size="lg"
              >
                <MessageCircle className="size-5" aria-hidden /> Order on WhatsApp
              </ButtonLink>
            ) : (
              <ButtonLink href="/contact" variant="outline" size="lg">Get in touch</ButtonLink>
            )}
          </div>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-xl lg:order-2">
          <div className="absolute inset-6 -z-10 rounded-full bg-beige/70 blur-3xl" aria-hidden />
          <div className="relative aspect-square overflow-hidden rounded-[2.5rem] bg-beige shadow-lift sm:rounded-[3rem]">
            <SmartImage
              src={s.heroImage}
              alt="A rich, fudgy DGAP brownie"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
          <FloatingLabel className="-left-2 top-8 sm:-left-6" delay="0s">Freshly Baked</FloatingLabel>
          <FloatingLabel className="-right-2 top-1/2 sm:-right-6" delay="1.2s">Small Batch</FloatingLabel>
          <FloatingLabel className="bottom-8 left-4 sm:-left-2" delay="2.4s">Premium Chocolate</FloatingLabel>
        </div>
      </div>
    </section>
  );
}

function FloatingLabel({ children, className, delay }: { children: string; className: string; delay: string }) {
  return (
    <span
      className={`animate-float absolute rounded-full bg-white/95 px-4 py-2 text-xs font-bold tracking-wide text-choc shadow-card backdrop-blur sm:text-sm ${className}`}
      style={{ animationDelay: delay }}
    >
      <span className="mr-2 inline-block size-1.5 rounded-full bg-caramel align-middle" aria-hidden />
      {children}
    </span>
  );
}

const TRUST = [
  { icon: Gem, label: "Premium Ingredients" },
  { icon: Flame, label: "Freshly Baked" },
  { icon: ChefHat, label: "Small Batch" },
  { icon: PackageCheck, label: "Secure Packaging" },
  { icon: Truck, label: "Local Delivery" },
];

export function TrustBar() {
  return (
    <section aria-label="Why customers trust us" className="bg-choc text-cream">
      <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-3 py-5 sm:grid-cols-3 lg:grid-cols-5">
        {TRUST.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center justify-center gap-2.5 text-sm font-semibold lg:justify-center">
            <Icon className="size-5 shrink-0 text-gold" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

const WHY = [
  { icon: Flame, title: "Freshly Baked", text: "Baked with care so every brownie reaches you at its best." },
  { icon: Gem, title: "Premium Ingredients", text: "Chocolate-first recipes, because the basics matter most." },
  { icon: ChefHat, title: "Small Batch", text: "Made in small batches to keep the quality high." },
  { icon: Heart, title: "Made With Love", text: "Every box is packed by hand for your sweetest moments." },
];

export function WhyDgap() {
  return (
    <section className="container-page py-20 lg:py-28" aria-labelledby="why-title">
      <Reveal>
        <SectionHeading eyebrow="Our promise" title={<span id="why-title">Why DGAP?</span>} subtitle="Made for chocolate lovers." />
      </Reveal>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Reveal delay={i * 80} className="h-full">
              <div className="h-full rounded-3xl border border-beige bg-white p-7 transition hover:-translate-y-1 hover:shadow-card">
                <span className="grid size-14 place-items-center rounded-2xl bg-choc text-gold">
                  <Icon className="size-7" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-choc">{title}</h3>
                <p className="mt-2 text-ink/70">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SignatureSection({
  s,
  product,
}: {
  s: SiteSettings;
  product: { slug: string; name: string; shortDescription: string | null; price: number; images: string[] };
}) {
  return (
    <section className="bg-espresso text-cream" aria-labelledby="signature-title">
      <div className="container-page grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <Reveal>
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] bg-choc">
            <SmartImage
              src={s.signatureImage || product.images[0]}
              alt={`${product.name}, the DGAP signature brownie`}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover transition-transform duration-1000 hover:scale-105"
            />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">The DGAP Signature</p>
          <h2 id="signature-title" className="mt-4 text-balance text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">
            Deep Chocolate. <span className="block italic text-gold">Soft Centre.</span> Pure Indulgence.
          </h2>
          <p className="mt-6 max-w-lg text-lg text-cream/75">
            {product.shortDescription ?? `Meet ${product.name}, our signature brownie.`}
          </p>
          <p className="mt-5 font-display text-2xl">
            {product.name} <span className="text-gold">· {formatINR(product.price)}</span>
          </p>
          <ButtonLink href={`/shop/${product.slug}`} variant="caramel" size="lg" className="mt-8">
            Try it now
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}

const OCCASIONS = ["Birthday", "Anniversary", "Thank You", "Celebration"];

export function GiftingSection() {
  return (
    <section className="container-page py-20 lg:py-28" aria-labelledby="gift-title">
      <div className="relative overflow-hidden rounded-[2rem] bg-beige px-6 py-14 text-center sm:px-12 lg:py-20">
        <Gift className="mx-auto size-10 text-caramel" aria-hidden />
        <Reveal>
          <h2 id="gift-title" className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-semibold leading-tight text-choc sm:text-5xl">
            Make Someone&apos;s Day Extra Chocolatey.
          </h2>
        </Reveal>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {OCCASIONS.map((o) => (
            <li key={o}>
              <Link href="/shop?flag=gift" className="inline-flex min-h-11 items-center rounded-full border border-choc/20 bg-cream px-6 text-sm font-semibold text-choc transition hover:bg-choc hover:text-cream">
                {o}
              </Link>
            </li>
          ))}
        </ul>
        <ButtonLink href="/shop?flag=gift" size="lg" className="mt-10">
          Shop gift boxes
        </ButtonLink>
      </div>
    </section>
  );
}

function instagramHandle(url: string): string | null {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg ? `@${seg}` : null;
  } catch {
    return null;
  }
}

export function InstagramSection({ url }: { url: string }) {
  const handle = instagramHandle(url);
  return (
    <section className="container-page py-16 text-center" aria-labelledby="insta-title">
      <Reveal>
        <SectionHeading
          eyebrow="Social"
          title={<span id="insta-title">Follow The Chocolate Trail</span>}
          subtitle="Fresh bakes, behind-the-scenes and new flavours first."
        />
        <ButtonLink href={url} external variant="outline" size="lg" className="mt-8">
          <Instagram className="size-5" aria-hidden /> Follow {handle ? handle.toUpperCase() : "us on Instagram"}
        </ButtonLink>
      </Reveal>
    </section>
  );
}

export function FinalCta({ s }: { s: SiteSettings }) {
  return (
    <section className="container-page pb-4" aria-labelledby="final-title">
      <div className="relative overflow-hidden rounded-[2rem] bg-choc px-6 py-16 text-center text-cream sm:py-24">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(60% 80% at 50% 0%, var(--caramel), transparent)" }} aria-hidden />
        <div className="relative">
          <h2 id="final-title" className="text-balance text-4xl font-semibold sm:text-6xl">
            Your Brownie Is Waiting.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-cream/80">Freshly baked. Deeply chocolatey. One bite, instant happiness.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/shop" variant="caramel" size="lg">Order now</ButtonLink>
            {s.whatsappDigits ? (
              <ButtonLink href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName, "I'd like to order brownies."))} external variant="outline-light" size="lg">
                <MessageCircle className="size-5" aria-hidden /> WhatsApp us
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
