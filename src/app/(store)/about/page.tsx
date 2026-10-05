import type { Metadata } from "next";
import { getSettings } from "@/lib/config";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { WhyDgap } from "@/components/home/sections";

export const metadata: Metadata = {
  title: "About us",
  description: "Premium handcrafted brownies and dessert boxes, baked in small batches for chocolate lovers.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Made for chocolate lovers" subtitle={s.tagline} crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <div className="container-page max-w-3xl py-12 lg:py-16">
        {s.aboutStory ? (
          <div className="space-y-5 whitespace-pre-line text-lg leading-relaxed text-fg/80">{s.aboutStory}</div>
        ) : (
          <p className="text-lg leading-relaxed text-fg/80">
            {s.brandName} bakes rich, fudgy brownies in small batches. Every box is made for your sweetest moments: birthdays, thank-yous, celebrations, or just because.
          </p>
        )}
      </div>
      <WhyDgap />
      <div className="container-page pb-4 text-center"><ButtonLink href="/shop" size="lg">Shop brownies</ButtonLink></div>
    </>
  );
}
