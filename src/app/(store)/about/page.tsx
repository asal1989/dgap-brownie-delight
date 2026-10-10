import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/components/ui/section";
import { BRAND } from "@/lib/content";

export const metadata: Metadata = {
  title: "Our story",
  description: "DGAP Brownie Delight is a Bangalore brownie bakery focused on rich, fudgy chocolate brownies made with care.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Our story" title={BRAND.story.title} />
      <section className="container-x grid items-center gap-14 py-20 lg:grid-cols-2 lg:gap-24">
        <Reveal className="relative">
          <div className="relative aspect-[4/3] overflow-hidden bg-ivory-deep"><Image src="/images/tray.jpg" alt="A tray of freshly baked brownies" fill priority sizes="(min-width: 1024px) 50vw, 92vw" className="object-cover" /></div>
          <span className="pointer-events-none absolute -bottom-4 -right-4 hidden size-full border border-gold lg:block" aria-hidden />
        </Reveal>
        <Reveal>
          <p className="eyebrow mb-4">DGAP Brownie Delight</p>
          <h2 className="text-5xl">Where every bite feels homemade.</h2>
          <span className="rule-gold my-7" aria-hidden />
          {BRAND.story.paragraphs.map((t) => <p key={t} className="mb-4 text-lg text-muted">{t}</p>)}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/shop" className="btn btn-primary">Explore our brownies</Link>
            <Link href="/contact" className="btn btn-outline">Get in touch</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
