import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BestsellersSection, BrandStory, BuildBoxBand, FaqSection, FinalCta, FlavourSection, GiftTeaser, HomeHero,
  InstagramGallery, NewsletterSection, ReviewsSection, SignatureFeature, WhySection,
} from "@/components/home/sections";
import { bakeryJsonLd, jsonLdString } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: { absolute: "DGAP Brownie Delight | Premium Artisan Brownies in Bangalore" },
  description: "Where every bite feels homemade. Handcrafted brownies, assorted boxes and gift boxes from Bangalore.",
  alternates: { canonical: "/" },
};

const Fallback = () => <div className="min-h-[320px]" aria-hidden />;

export default async function HomePage() {
  const settings = await getSettings();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(bakeryJsonLd(settings)) }} />
      <HomeHero />
      <Suspense fallback={<Fallback />}><BestsellersSection /></Suspense>
      <Suspense fallback={<Fallback />}><FlavourSection /></Suspense>
      <Suspense fallback={null}><SignatureFeature /></Suspense>
      <BuildBoxBand />
      <WhySection />
      <Suspense fallback={<Fallback />}><GiftTeaser settings={settings} /></Suspense>
      <BrandStory />
      <Suspense fallback={<Fallback />}><ReviewsSection settings={settings} /></Suspense>
      <Suspense fallback={null}><InstagramGallery settings={settings} /></Suspense>
      <Suspense fallback={<Fallback />}><FaqSection settings={settings} /></Suspense>
      <NewsletterSection />
      <FinalCta />
    </>
  );
}
