import type { Metadata } from "next";
import { ChefHat, Flame, Gem, Heart } from "lucide-react";
import { getSettings } from "@/lib/config";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About us",
  description: "Premium handcrafted brownies and dessert boxes, baked in small batches for chocolate lovers.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: Flame, title: "Freshly baked" },
  { icon: Gem, title: "Premium ingredients" },
  { icon: ChefHat, title: "Small batch" },
  { icon: Heart, title: "Made with love" },
];

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Made for chocolate lovers" subtitle={s.tagline} crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <div className="container-page max-w-3xl py-12 lg:py-16">
        {s.aboutStory ? (
          <div className="space-y-5 whitespace-pre-line text-lg leading-relaxed text-ink/80">{s.aboutStory}</div>
        ) : (
          <p className="text-lg leading-relaxed text-ink/80">
            {s.brandName} bakes rich, fudgy brownies in small batches. Every box is made for your sweetest moments: birthdays, thank-yous, celebrations, or just because.
          </p>
        )}
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {VALUES.map(({ icon: Icon, title }) => (
            <li key={title} className="rounded-3xl border border-beige bg-white p-5 text-center">
              <Icon className="mx-auto size-8 text-caramel" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-choc">{title}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 text-center"><ButtonLink href="/shop" size="lg">Shop brownies</ButtonLink></div>
      </div>
    </>
  );
}
