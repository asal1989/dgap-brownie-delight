import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Gift, Hand, MessageCircle, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Price, SectionHeading } from "@/components/ui/section";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { ProductGridList } from "@/components/store/product-card";
import { BRAND, buildFaqs } from "@/lib/content";
import { db } from "@/lib/db";
import { resolveWhatsAppNumber, type Settings } from "@/lib/settings";
import { getApprovedReviews, getBestsellers, getCategories, getFeaturedProduct, toCard } from "@/lib/store-queries";
import { whatsAppUrl } from "@/lib/whatsapp";
import { Hero3D } from "./hero-3d";
import { NewsletterForm } from "./newsletter-form";

const WHY_ICONS = { hand: Hand, flavours: Sparkles, gift: Gift, chat: MessageCircle } as const;

export function HomeHero() {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-forest" aria-labelledby="hero-title">
      <div className="grid lg:min-h-[min(88vh,780px)] lg:grid-cols-2">
        <div className="relative order-2 flex flex-col justify-center px-5 py-14 sm:py-20 lg:order-1 lg:py-24 lg:pl-[max(1.25rem,calc((100vw-1240px)/2))] lg:pr-12">
          <p className="eyebrow animate-[rise_1s_0.1s_both]">Artisan brownies · Bangalore</p>
          <h1 id="hero-title" className="mt-5 text-[clamp(2.9rem,7vw,5.6rem)] leading-[0.98] animate-[rise_1s_0.25s_both]">{BRAND.tagline}</h1>
          <p className="mt-7 max-w-[30rem] text-[1.15rem] text-ivory/85 animate-[rise_1s_0.4s_both]">{BRAND.heroSub}</p>
          <div className="mt-10 flex flex-wrap gap-4 animate-[rise_1s_0.55s_both]">
            <Link href="/shop" className="btn btn-gold btn-lg">Discover Our Brownies</Link>
            <Link href="/gift-boxes" className="btn btn-outline-light btn-lg">Explore Gift Boxes</Link>
          </div>
        </div>
        <div className="relative order-1 min-h-[340px] lg:order-2 lg:min-h-0">
          <Hero3D />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-forest/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-forest lg:via-transparent lg:to-transparent lg:via-[30%]" aria-hidden />
        </div>
      </div>
    </section>
  );
}

export async function BestsellersSection() {
  const products = await getBestsellers(3);
  if (!products.length) return null;
  return (
    <section className="py-24 sm:py-32" aria-labelledby="best-title">
      <div className="container-x">
        <SectionHeading eyebrow="Bestselling brownies" id="best-title" title="Our signature favourites" sub="The brownies our customers come back for." />
        <ProductGridList products={products} priorityCount={0} />
        <Reveal className="mt-14 text-center">
          <Link href="/shop" className="btn btn-outline">View the full collection <ArrowRight size={16} aria-hidden /></Link>
        </Reveal>
      </div>
    </section>
  );
}

export async function FlavourSection() {
  const categories = (await getCategories()).filter((c) => c._count.products > 0);
  const firstImages = await db.product.findMany({
    where: { status: "ACTIVE", categoryId: { in: categories.map((c) => c.id) } },
    orderBy: { sortOrder: "asc" },
    select: { categoryId: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } } },
  });
  const imgOf = (id: string) => firstImages.find((p) => p.categoryId === id)?.images[0];
  const shown = categories.filter((c) => imgOf(c.id)).slice(0, 6);
  if (!shown.length) return null;
  return (
    <section className="bg-ivory-deep py-24 sm:py-32" aria-labelledby="flavour-title">
      <div className="container-x">
        <SectionHeading eyebrow="Browse by flavour" id="flavour-title" title="Find your flavour" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c, i) => {
            const im = imgOf(c.id)!;
            return (
              <Reveal as="li" key={c.id} delay={(i % 3) * 0.08}>
                <Link href={`/categories/${c.slug}`} className="group relative block aspect-[5/4] overflow-hidden bg-forest">
                  <Image src={im.url} alt={im.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.06]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/10 to-transparent" aria-hidden />
                  <span className="pointer-events-none absolute inset-3 border border-gold/0 transition-colors duration-500 group-hover:border-gold/70" aria-hidden />
                  <span className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                    <span className="block font-serif text-[1.9rem] leading-tight">{c.name}</span>
                    <span className="mt-1 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">Explore <ArrowRight size={14} aria-hidden /></span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export async function SignatureFeature() {
  const p = await getFeaturedProduct();
  if (!p?.image) return null;
  return (
    <section className="py-24 sm:py-32" aria-labelledby="sig-title">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <Reveal className="relative">
          <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
            <Image src={p.image.url} alt={p.image.alt} fill sizes="(min-width: 1024px) 45vw, 92vw" className="object-cover" />
          </div>
          <span className="pointer-events-none absolute -bottom-4 -right-4 hidden size-full border border-gold lg:block" aria-hidden />
        </Reveal>
        <Reveal>
          <p className="eyebrow mb-4">The signature brownie</p>
          <h2 id="sig-title" className="text-[clamp(2.4rem,5vw,4rem)]">{p.name}</h2>
          <span className="rule-gold my-7" aria-hidden />
          <p className="max-w-lg text-lg text-muted">{p.shortDescription}</p>
          <p className="mt-6"><Price paise={p.fromPricePaise} from={p.fromPricePaise != null} /></p>
          <Link href={`/shop/${p.slug}`} className="btn btn-primary btn-lg mt-8">Discover {p.name.split(" ")[0]}</Link>
        </Reveal>
      </div>
    </section>
  );
}

export function BuildBoxBand() {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-forest py-24 sm:py-32" aria-labelledby="box-title">
      <Image src="/images/swirl-rack.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-25" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest via-forest/90 to-forest/40" aria-hidden />
      <div className="container-x">
        <Reveal className="max-w-xl">
          <p className="eyebrow mb-4">Build your own box</p>
          <h2 id="box-title" className="text-[clamp(2.4rem,5vw,4rem)]">Your flavours, your box.</h2>
          <span className="rule-gold my-7" aria-hidden />
          <p className="text-lg text-ivory/85">Choose a box size, then fill it with the brownies you love. See your selection and total before you order.</p>
          <Link href="/build-your-box" className="btn btn-gold btn-lg mt-9">Start building</Link>
        </Reveal>
      </div>
    </section>
  );
}

export function WhySection() {
  return (
    <section className="py-24 sm:py-32" aria-labelledby="why-title">
      <div className="container-x">
        <SectionHeading eyebrow="Why DGAP" id="why-title" title="Made with care" />
        <ul className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {BRAND.why.map((w, i) => {
            const Icon = WHY_ICONS[w.icon];
            return (
              <Reveal as="li" key={w.title} delay={i * 0.08} className="border-b border-line px-6 py-12 text-center sm:[&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0 lg:[&:nth-child(odd)]:border-r">
                <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-gold text-gold-deep"><Icon size={24} strokeWidth={1.4} aria-hidden /></span>
                <h3 className="text-[1.6rem]">{w.title}</h3>
                <p className="mx-auto mt-3 max-w-[26ch] text-sm text-muted">{w.text}</p>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export async function GiftTeaser({ settings }: { settings: Settings }) {
  const gifts = await db.product.findMany({
    where: { status: "ACTIVE", category: { slug: "gift-boxes" } },
    orderBy: { sortOrder: "asc" },
    take: 3,
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }, category: true },
  });
  const wa = whatsAppUrl(resolveWhatsAppNumber(settings), `Hello ${settings.businessName}! This is an enquiry, not an order. I would like to know about your brownie gift boxes.`);
  return (
    <section className="bg-ivory-deep py-24 sm:py-32" aria-labelledby="gift-title">
      <div className="container-x">
        <SectionHeading eyebrow="Premium gift boxes" id="gift-title" title="Brownies, beautifully gifted" sub="Thoughtfully packed for birthdays, festivals, thank-yous and celebrations." />
        {gifts.length > 0 ? (
          <ProductGridList products={gifts.map(toCard)} />
        ) : (
          <Reveal className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div className="relative aspect-[5/4] overflow-hidden bg-forest"><Image src="/images/gift-box.jpg" alt="A gift box" fill sizes="(min-width: 768px) 45vw, 92vw" className="object-cover" /></div>
            <div>
              <h3 className="text-4xl">Our gift boxes are being curated</h3>
              <p className="mt-4 text-muted">Tell us the occasion and we will help you put together the perfect box.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/gift-boxes" className="btn btn-primary">Gift boxes</Link>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><WhatsAppIcon width={18} height={18} /> Enquire on WhatsApp</a>}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

export function BrandStory() {
  return (
    <section className="on-dark bg-forest py-24 sm:py-32" aria-labelledby="story-title" id="story">
      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
        <Reveal className="relative">
          <div className="relative aspect-[4/3] overflow-hidden"><Image src="/images/tray.jpg" alt="A tray of freshly baked brownies" fill sizes="(min-width: 1024px) 55vw, 92vw" className="object-cover" /></div>
          <span className="pointer-events-none absolute -bottom-4 -right-4 hidden size-full border border-gold lg:block" aria-hidden />
        </Reveal>
        <Reveal>
          <p className="eyebrow mb-4">Our story</p>
          <h2 id="story-title" className="text-[clamp(2.3rem,4.8vw,3.6rem)]">{BRAND.story.title}</h2>
          <span className="rule-gold my-7" aria-hidden />
          {BRAND.story.paragraphs.map((t) => <p key={t} className="mb-4 text-lg text-ivory/85">{t}</p>)}
          <Link href="/about" className="btn btn-gold mt-4">Read our story</Link>
        </Reveal>
      </div>
    </section>
  );
}

export async function ReviewsSection({ settings }: { settings: Settings }) {
  const reviews = await getApprovedReviews(6);
  const wa = whatsAppUrl(resolveWhatsAppNumber(settings), `Hello ${settings.businessName}! I would like to share feedback about my brownies.`);
  return (
    <section className="py-24 sm:py-32" aria-labelledby="rev-title">
      <div className="container-x">
        <SectionHeading eyebrow="Customer love" id="rev-title" title="What our customers say" />
        {reviews.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal as="li" key={r.id} delay={(i % 3) * 0.08} className="card-line p-8">
                <p className="text-gold-deep" role="img" aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                <blockquote className="mt-3 font-serif text-[1.45rem] italic leading-snug text-forest">“{r.body}”</blockquote>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em]">{r.authorName} · {r.product.name}{r.verifiedPurchase ? " · Verified purchase" : ""}</p>
              </Reveal>
            ))}
          </ul>
        ) : (
          <Reveal className="mx-auto max-w-xl border border-line bg-white px-8 py-12 text-center">
            <h3 className="text-3xl">Reviews are coming soon</h3>
            <p className="mt-3 text-muted">We only show genuine feedback from customers who have ordered. Tried our brownies? We would love to hear from you.</p>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-6">Share your feedback</a>}
          </Reveal>
        )}
      </div>
    </section>
  );
}

export async function InstagramGallery({ settings }: { settings: Settings }) {
  const images = await db.productImage.findMany({
    where: { product: { status: "ACTIVE", kind: "STANDARD" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 6,
    select: { url: true, alt: true },
    distinct: ["url"],
  });
  if (!images.length) return null;
  return (
    <section className="bg-ivory-deep py-24 sm:py-32" aria-labelledby="ig-title">
      <div className="container-x">
        <SectionHeading eyebrow="Instagram" id="ig-title" title="Fresh from our kitchen" sub="A little look at what we bake." />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {images.map((im, i) => {
            const tile = (
              <span className="group relative block aspect-square overflow-hidden bg-forest">
                <Image src={im.url} alt={im.alt} fill sizes="(min-width: 1024px) 16vw, (min-width: 640px) 32vw, 48vw" className="object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.07]" />
              </span>
            );
            return (
              <Reveal as="li" key={im.url} delay={(i % 6) * 0.05}>
                {settings.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`${im.alt} (opens Instagram)`}>{tile}</a> : tile}
              </Reveal>
            );
          })}
        </ul>
        {settings.instagramUrl && (
          <p className="mt-10 text-center">
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline"><InstagramIcon width={18} height={18} /> Follow us on Instagram</a>
          </p>
        )}
      </div>
    </section>
  );
}

export async function FaqSection({ settings }: { settings: Settings }) {
  const names = (await db.product.findMany({ where: { status: "ACTIVE", kind: "STANDARD", boxSelectable: true }, orderBy: { sortOrder: "asc" }, select: { name: true } })).map((p) => p.name);
  const faqs = buildFaqs(settings, names);
  return (
    <section className="py-24 sm:py-32" aria-labelledby="faq-title">
      <div className="container-narrow">
        <SectionHeading eyebrow="FAQ" id="faq-title" title="Frequently asked questions" />
        <div className="border-t border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-line">
              <summary className="flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-4 py-3 font-serif text-[1.45rem] leading-snug text-forest [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={20} className="shrink-0 text-gold-deep transition-transform duration-300 group-open:rotate-180" aria-hidden />
              </summary>
              <p className="max-w-[60ch] pb-6 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewsletterSection() {
  return (
    <section className="on-dark bg-forest-deep py-24 text-center sm:py-28" aria-labelledby="nl-title">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow mb-4">Stay in touch</p>
          <h2 id="nl-title" className="mx-auto max-w-xl text-[clamp(2.2rem,4.5vw,3.2rem)]">Be first to hear about new brownies</h2>
          <p className="mx-auto mt-4 max-w-md text-ivory/75">Occasional news, new flavours and seasonal boxes. Nothing more.</p>
          <NewsletterForm />
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-ivory py-24 text-center sm:py-32" aria-labelledby="cta-title">
      <div className="container-x">
        <Reveal>
          <h2 id="cta-title" className="mx-auto max-w-3xl text-[clamp(2.4rem,5.5vw,4.4rem)]">Your next chocolate moment starts here.</h2>
          <span className="rule-gold mx-auto my-8" aria-hidden />
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/shop" className="btn btn-primary btn-lg">Order brownies</Link>
            <Link href="/build-your-box" className="btn btn-outline btn-lg">Build your box</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
