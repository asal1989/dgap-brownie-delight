import Link from "next/link";
import { ArrowRight, Check, ChefHat, Flame, Gem, Gift, Heart, MessageCircle, PackageCheck, Truck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Parallax } from "@/components/ui/parallax";
import { Instagram } from "@/components/ui/social-icons";
import { buildEnquiryMessage, whatsappLink } from "@/lib/whatsapp";
import { formatINR } from "@/lib/utils";
import type { SiteSettings } from "@/lib/config";

const HERO_ART = "/images/branding/hero-brownie.svg";

export function Hero({ s }: { s: SiteSettings }) {
  const hasPhoto = Boolean(s.heroImage);
  return (
    <section className="relative isolate overflow-hidden bg-espresso text-cream" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-10" aria-hidden style={{ background: "radial-gradient(60% 70% at 72% 45%, rgba(184,115,51,.28), transparent 70%), radial-gradient(40% 50% at 10% 100%, rgba(200,148,82,.12), transparent 70%)" }} />
      <div className="container-page grid items-center gap-6 pb-16 pt-6 lg:min-h-[44rem] lg:grid-cols-[1.02fr_1fr] lg:gap-8 lg:pb-24 lg:pt-10">
        <div className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-gold sm:text-xs">
            <span className="h-px w-8 bg-gold" aria-hidden /> Freshly baked • Premium ingredients
          </p>
          <h1 id="hero-title" className="mt-6 text-balance text-[3.1rem] font-semibold leading-[0.98] text-cream sm:text-7xl lg:text-[5.6rem]">
            Brownies Worth <span className="italic text-gold">Craving.</span>
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg text-cream/75 sm:text-xl">Rich, fudgy brownies made for your sweetest moments.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/shop" variant="caramel" size="lg">Shop brownies</ButtonLink>
            {s.whatsappDigits ? (
              <ButtonLink href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName, "I'd like to order brownies."))} external variant="outline-light" size="lg">
                <MessageCircle className="size-5" aria-hidden /> Order on WhatsApp
              </ButtonLink>
            ) : (
              <ButtonLink href="/contact" variant="outline-light" size="lg">Get in touch</ButtonLink>
            )}
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-cream/85">
            {["Freshly baked", "Premium ingredients", "Small batch"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="size-4 text-gold" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-[34rem] lg:order-2 lg:max-w-none">
          <Parallax strength={26}>
            {hasPhoto ? (
              <div className="relative mx-auto aspect-[4/5] w-[88%] overflow-hidden rounded-[2rem] shadow-2xl shadow-black/40 lg:w-[82%]">
                <SmartImage src={s.heroImage} alt="A rich, fudgy DGAP brownie" fill priority sizes="(min-width: 1024px) 42vw, 90vw" className="object-cover" />
              </div>
            ) : (
              <div className="animate-float relative aspect-[1.45/1] w-full">
                <div className="absolute inset-[-8%] -z-0 rounded-full" aria-hidden style={{ background: "radial-gradient(closest-side, rgba(184,115,51,.5), rgba(184,115,51,0) 72%)" }} />
                <SmartImage src={HERO_ART} alt="A rich, fudgy DGAP brownie" fill priority sizes="(min-width: 1024px) 52vw, 95vw" className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,.45)]" />
              </div>
            )}
          </Parallax>
          <span className="absolute left-0 top-[14%] rounded-full bg-cream px-4 py-2 text-xs font-bold text-choc shadow-card sm:text-sm lg:-left-2">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-caramel align-middle" aria-hidden />Freshly Baked
          </span>
          <span className="absolute bottom-[12%] right-0 rounded-full bg-cream px-4 py-2 text-xs font-bold text-choc shadow-card sm:text-sm">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-caramel align-middle" aria-hidden />Small Batch
          </span>
        </div>
      </div>
    </section>
  );
}

export function TrustBar({ whatsapp }: { whatsapp: boolean }) {
  const items = [
    { icon: PackageCheck, label: "Secure packaging" },
    { icon: Truck, label: "Local delivery" },
    { icon: Gift, label: "Gift-ready boxes" },
    ...(whatsapp ? [{ icon: MessageCircle, label: "Order on WhatsApp" }] : []),
  ];
  return (
    <section aria-label="Ordering at a glance" className="border-b border-beige bg-cream">
      <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-3 py-5 sm:flex sm:justify-center sm:gap-12">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5 text-sm font-semibold text-choc">
            <Icon className="size-5 shrink-0 text-caramel" aria-hidden />
            {label}
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
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {WHY.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Reveal delay={i * 80} className="h-full">
              <div className="group relative h-full overflow-hidden rounded-2xl bg-choc p-7 text-cream transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="absolute right-5 top-4 font-display text-5xl font-bold text-white/[0.06]" aria-hidden>0{i + 1}</span>
                <span className="grid size-14 place-items-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/30 transition group-hover:bg-gold group-hover:text-espresso">
                  <Icon className="size-7" aria-hidden />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-cream">{title}</h3>
                <p className="mt-2 text-cream/70">{text}</p>
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
    <section className="overflow-hidden bg-espresso text-cream" aria-labelledby="signature-title">
      <div className="container-page grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-32">
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-6 -z-0 rounded-[3rem] bg-caramel/15 blur-3xl" aria-hidden />
            <Parallax strength={34}>
              <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-choc ring-1 ring-white/10">
                <SmartImage
                  src={s.signatureImage || product.images[0]}
                  alt={`${product.name}, the DGAP signature brownie`}
                  fill
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Parallax>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">The DGAP Signature</p>
          <h2 id="signature-title" className="mt-5 text-balance text-4xl font-semibold leading-[1.05] text-cream sm:text-5xl lg:text-6xl">
            Deep Chocolate.
            <span className="block italic text-gold">Soft Centre.</span>
            Pure Indulgence.
          </h2>
          <p className="mt-6 max-w-md text-lg text-cream/75">{product.shortDescription ?? `Meet ${product.name}, our signature brownie.`}</p>
          <p className="mt-6 font-display text-2xl">
            {product.name} <span className="text-gold">· {formatINR(product.price)}</span>
          </p>
          <ButtonLink href={`/shop/${product.slug}`} variant="caramel" size="lg" className="mt-9">
            Try the signature
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}

const OCCASIONS = [
  { title: "Birthday", text: "A box of brownies makes any birthday sweeter.", art: "fudge" },
  { title: "Anniversary", text: "Share something indulgent for two.", art: "nutella" },
  { title: "Thank You", text: "A tasty way to say thanks.", art: "biscoff" },
  { title: "Celebration", text: "Treats for every occasion worth marking.", art: "chocolate-chip" },
  { title: "Corporate Gifts", text: "Impress clients and teams. Ask us about bulk orders.", art: "assorted-box" },
];

export function GiftingSection() {
  return (
    <section className="section bg-beige/40" aria-labelledby="gift-title">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="Gifting"
            title={<span id="gift-title">Make Someone&apos;s Day Extra Chocolatey.</span>}
            subtitle="Beautiful brownie boxes for every moment."
          />
        </Reveal>
        <ul className="no-scrollbar relative -mx-5 mt-14 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 sm:gap-5 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="Gifting occasions">
          {OCCASIONS.map((o) => (
            <li key={o.title} className="w-[68%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
              <Link href="/shop?flag=gift" className="group flex h-full flex-col overflow-hidden rounded-2xl border border-beige bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="relative block aspect-[4/3] overflow-hidden bg-beige">
                  <SmartImage src={`/images/products/${o.art}.svg`} alt="" fill sizes="(min-width: 1024px) 20vw, 60vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="font-display text-xl font-semibold text-choc">{o.title}</span>
                  <span className="mt-1.5 text-sm text-ink/70">{o.text}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-bold uppercase tracking-[0.16em] text-caramel">
                    Shop gift boxes <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
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
    <section className="container-page py-16 text-center" aria-labelledby="insta-title">
      <Reveal>
        <SectionHeading eyebrow="Social" title={<span id="insta-title">Follow The Chocolate Trail</span>} subtitle="Fresh bakes, behind-the-scenes and new flavours first." />
        <ButtonLink href={url} external variant="outline" size="lg" className="mt-8">
          <Instagram className="size-5" aria-hidden /> Follow {handle ? handle.toUpperCase() : "us on Instagram"}
        </ButtonLink>
      </Reveal>
    </section>
  );
}

export function FinalCta({ s }: { s: SiteSettings }) {
  return (
    <section className="section container-page pt-0" aria-labelledby="final-title">
      <div className="relative isolate overflow-hidden rounded-3xl bg-espresso px-6 py-20 text-center text-cream sm:py-28">
        <div className="absolute inset-0 -z-10" aria-hidden style={{ background: "radial-gradient(55% 70% at 50% 0%, rgba(184,115,51,.40), transparent 70%)" }} />
        <SmartImage src={HERO_ART} alt="" width={640} height={440} className="pointer-events-none absolute -bottom-16 left-1/2 -z-10 w-[34rem] max-w-none -translate-x-1/2 opacity-[0.12]" />
        <Sparkles className="mx-auto size-7 text-gold" aria-hidden />
        <h2 id="final-title" className="mx-auto mt-5 max-w-3xl text-balance text-5xl font-semibold leading-[1.02] text-cream sm:text-7xl">
          Your Brownie Is <span className="italic text-gold">Waiting.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-lg text-cream/80 sm:text-xl">Freshly baked. Deeply chocolatey. Impossible to resist.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/shop" variant="caramel" size="lg">Order now</ButtonLink>
          {s.whatsappDigits ? (
            <ButtonLink href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName, "I'd like to order brownies."))} external variant="outline-light" size="lg">
              <MessageCircle className="size-5" aria-hidden /> WhatsApp us
            </ButtonLink>
          ) : (
            <ButtonLink href="/contact" variant="outline-light" size="lg">Contact us</ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
