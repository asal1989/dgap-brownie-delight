import type { Metadata } from "next";
import { getFaqs } from "@/lib/db/queries";
import { getSettings } from "@/lib/config";
import { PageHeader } from "@/components/layout/page-header";
import { FAQ } from "@/components/ui/faq";
import { JsonLd } from "@/components/ui/json-ld";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about freshness, storage, delivery, gift boxes and bulk orders.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const [faqs, s] = await Promise.all([getFaqs(), getSettings()]);
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <PageHeader title="Good to know" subtitle={`Everything about ordering from ${s.brandName}.`} crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
      <div className="container-page py-12 lg:py-16">
        {faqs.length ? (
          <>
            <JsonLd data={ld} />
            <FAQ items={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          </>
        ) : (
          <EmptyState title="Answers coming soon" text="Have a question in the meantime? We're happy to help.">
            <ButtonLink href="/contact">Contact us</ButtonLink>
          </EmptyState>
        )}
      </div>
    </>
  );
}
