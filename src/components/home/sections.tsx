import Link from "next/link";
import { ArrowRight, Check, ChefHat, Flame, Gem, Heart, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Parallax } from "@/components/ui/parallax";
import { Instagram } from "@/components/ui/social-icons";
import { buildEnquiryMessage, whatsappLink } from "@/lib/whatsapp";
import { formatINR } from "@/lib/utils";
import type { SiteSettings } from "@/lib/config";

/** Temporary stock photography (see public/images/photos/CREDITS.md). Replace via Admin → Settings. */
export const PHOTO = {
  hero: "/images/photos/hero-fudgie.jpg",
  signature: "/images/photos/plate-stack.jpg",
  swirl: "/images/photos/swirl-rack.jpg",
  fudge: "/images/photos/fudge-stack.jpg",
  box: "/images/photos/gift-box.jpg",
};

export function Hero({ s }: { s: SiteSettings }) {
  return (
    <section className="grain relative isolate overflow-hidden bg-espresso text-cream" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-10" aria-hidden style={{ background: "radial-gradient(55% 60% at 78% 40%, rgba(200,148,82,.18), transparent 70%), radial-gradient(45% 55% at 0% 100%, rgba(154,91,31,.16), transparent 70%)" }} />
      {/* Mobile order: headline -> image -> buttons -> trust points. Desktop: copy left, image right. */}
      <div className="container-page grid gap-x-16 gap-y-9 pb-16 pt-8 lg:min-h-[44rem] lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-[auto_auto] lg:content-center lg:items-center lg:pb-24 lg:pt-12">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-gold sm:text-xs">
            <span className="h-px w-10 bg-gold" aria-hidden /> Freshly baked • Premium ingredients
          </p>
          <h1 id="hero-title" className="mt-6 text-balance text-[2.8rem] font-semibold leading-[1] text-cream sm:text-6xl lg:text-[5rem]">
            Brownies Worth <span className="italic text-gold">Craving.</span>
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-cream/75 sm:text-xl">Rich, fudgy brownies made for your sweetest moments.</p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none lg:self-center lg:pl-6">
          <div className="absolute -inset-0 translate-x-4 translate-y-4 border border-gold/50 lg:translate-x-6 lg:translate-y-6" aria-hidden />
          <Parallax strength={20}>
            <div className="relative aspect-square overflow-hidden bg-panel shadow-2xl shadow-black/50 lg:aspect-[4/5]">
              <SmartImage src={s.heroImage || PHOTO.hero} alt="A stack of rich, fudgy DGAP brownies" fill priority sizes="(min-width: 1024px) 42vw, 90vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-espresso/40 via-transparent to-transparent" aria-hidden />
            </div>
          </Parallax>
          <span className="absolute -left-2 top-[12%] bg-cream px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-espresso shadow-card sm:-left-5">Freshly baked</span>
          <span className="absolute -right-1 bottom-[10%] bg-gold px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-espresso shadow-card sm:-right-4">Small batch</span>
        </div>

        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" size="lg">Shop brownies <ArrowRight className="size-4" aria-hidden /></ButtonLink>
            <ButtonLink href="/shop?flag=gift" variant="outline-light" size="lg">Explore gift boxes <ArrowRight className="size-4" aria-hidden /></ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm font-semibold text-cream/85">
            {["Freshly baked", "Premium ingredients", "Small batch"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="size-4 text-gold" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const STRIP = ["Freshly baked", "Premium ingredients", "Small batch", "Secure packaging", "Local delivery"];

export function TrustBar() {
  return (
    <section aria-label="Our promise at a glance" className="border-y border-gold/20 bg-page">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-5 text-[11px] font-bold uppercase tracking-[0.26em] text-gold sm:gap-x-12">
        {STRIP.map((t, i) => (
          <li key={t} className="flex items-center gap-8 sm:gap-12">
            {t}
            {i < STRIP.length - 1 ? <span className="hidden size-1 rotate-45 bg-gold/60 sm:block" aria-hidden /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

const WHY = [
  { icon: Flame, title: "Freshly baked", text: "Baked with care so every brownie reaches you at its best." },
  { icon: Gem, title: "Premium ingredients", text: "Chocolate-first recipes, because the basics matter most." },
  { icon: ChefHat, title: "Small batch", text: "Made in small batches to keep the quality high." },
  { icon: Heart, title: "Made with love", text: "Every box is packed by hand for your sweetest moments." },
];

export function WhyDgap() {
  return (
    <section className="section container-page" aria-labelledby="why-title">
      <Reveal>
        <SectionHeading eyebrow="Our promise" title={<span id="why-title">Why DGAP?</span>} subtitle="Made for chocolate lovers." />
      </Reveal>
      <ul className="mt-16 grid gap-px overflow-hidden border border-gold/20 bg-gold/20 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="bg-panel">
            <Reveal delay={i * 80} className="h-full">
              <div className="group relative h-full p-8 transition duration-500 hover:bg-panel2 lg:p-10">
                <span className="font-display text-sm tracking-[0.3em] text-gold/70" aria-hidden>0{i + 1}</span>
                <span className="mt-6 grid size-14 place-items-center border border-gold/50 text-gold transition group-hover:bg-gold group-hover:text-espresso">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-7 text-2xl font-semibold text-heading">{title}</h3>
                <p className="mt-3 text-fg/75">{text}</p>
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
    <section className="grain relative overflow-hidden bg-espresso text-cream" aria-labelledby="signature-title">
      <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-24 lg:py-32">
        <Reveal className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em] text-gold">
            <span className="h-px w-10 bg-gold" aria-hidden /> The DGAP Signature
          </p>
          <h2 id="signature-title" className="mt-6 text-balance text-5xl font-semibold leading-[1.02] text-cream sm:text-6xl lg:text-7xl">
            Deep Chocolate.
            <span className="block italic text-gold">Soft Centre.</span>
            Pure Indulgence.
          </h2>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-cream/75">{product.shortDescription ?? `Meet ${product.name}, our signature brownie.`}</p>
          <p className="mt-7 font-display text-2xl text-cream">
            {product.name} <span className="text-gold">· {formatINR(product.price)}</span>
          </p>
          <ButtonLink href={`/shop/${product.slug}`} size="lg" className="mt-10">
            Try the signature
          </ButtonLink>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <div className="relative">
            <div className="absolute -inset-0 -translate-x-4 translate-y-4 border border-gold/50 lg:-translate-x-6 lg:translate-y-6" aria-hidden />
            <Parallax strength={36}>
              <div className="relative aspect-[4/5] overflow-hidden bg-panel lg:aspect-[5/6]">
                <SmartImage
                  src={s.signatureImage || PHOTO.signature}
                  alt={`${product.name}, the DGAP signature brownie`}
                  fill
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Parallax>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const OCCASIONS = [
  { title: "Birthday", text: "A box of brownies makes any birthday sweeter.", img: "/images/photos/plate-stack.jpg" },
  { title: "Anniversary", text: "Share something indulgent for two.", img: PHOTO.swirl },
  { title: "Thank You", text: "A tasty way to say thanks.", img: "/images/photos/golden-stack.jpg" },
  { title: "Celebration", text: "Treats for every occasion worth marking.", img: PHOTO.fudge },
  { title: "Corporate Gifts", text: "Impress clients and teams. Ask us about bulk orders.", img: PHOTO.box },
];

export function GiftingSection() {
  return (
    <section className="section bg-panel" aria-labelledby="gift-title">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="Gifting"
            title={<span id="gift-title">Make Someone&apos;s Day Extra Chocolatey.</span>}
            subtitle="Beautiful brownie boxes for every moment."
          />
        </Reveal>
        <ul className="no-scrollbar relative -mx-5 mt-16 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 sm:gap-5 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="Gifting occasions">
          {OCCASIONS.map((o) => (
            <li key={o.title} className="w-[70%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
              <Link href="/shop?flag=gift" className="group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden bg-panel2 p-5">
                <SmartImage src={o.img} alt="" fill sizes="(min-width: 1024px) 20vw, 60vw" className="-z-10 object-cover transition-transform duration-1000 group-hover:scale-105" />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-espresso via-espresso/40 to-transparent" aria-hidden />
                <span className="absolute inset-3 border border-gold/0 transition duration-500 group-hover:border-gold/60" aria-hidden />
                <span className="relative font-display text-2xl font-semibold text-cream">{o.title}</span>
                <span className="relative mt-1.5 text-sm text-cream/80">{o.text}</span>
                <span className="relative mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                  Shop gift boxes <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
    <section className="container-page py-20 text-center" aria-labelledby="insta-title">
      <Reveal>
        <SectionHeading eyebrow="Social" title={<span id="insta-title">Follow The Chocolate Trail</span>} subtitle="Fresh bakes, behind-the-scenes and new flavours first." />
        <ButtonLink href={url} external variant="outline" size="lg" className="mt-10">
          <Instagram className="size-5" aria-hidden /> Follow {handle ? handle : "us on Instagram"}
        </ButtonLink>
      </Reveal>
    </section>
  );
}

export function FinalCta({ s }: { s: SiteSettings }) {
  return (
    <section className="section container-page pt-0" aria-labelledby="final-title">
      <div className="grain relative isolate overflow-hidden bg-espresso px-6 py-24 text-center text-cream sm:py-32">
        <SmartImage src={PHOTO.box} alt="" fill sizes="100vw" className="-z-20 object-cover opacity-60" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-espresso/75 via-espresso/45 to-espresso/85" aria-hidden />
        <div className="absolute inset-4 border border-gold/40" aria-hidden />
        <p className="relative text-xs font-bold uppercase tracking-[0.32em] text-gold">Freshly baked • Small batch</p>
        <h2 id="final-title" className="relative mx-auto mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] text-cream sm:text-7xl">
          Your Brownie Is <span className="italic text-gold">Waiting.</span>
        </h2>
        <p className="relative mx-auto mt-7 max-w-xl text-pretty text-lg text-cream/85 sm:text-xl">Freshly baked. Deeply chocolatey. Impossible to resist.</p>
        <div className="relative mt-11 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/shop" size="lg">Order now</ButtonLink>
          {s.whatsappDigits ? (
            <ButtonLink href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName, "I'd like to order brownies."))} external variant="outline-light" size="lg">
              <MessageCircle className="size-4" aria-hidden /> WhatsApp us
            </ButtonLink>
          ) : (
            <ButtonLink href="/contact" variant="outline-light" size="lg">Contact us</ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
