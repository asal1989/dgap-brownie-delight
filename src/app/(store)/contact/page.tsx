import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { PageHero } from "@/components/ui/section";
import { getSettings, resolveWhatsAppNumber } from "@/lib/settings";
import { whatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with DGAP Brownie Delight to order, ask a question or plan a gift.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const wa = whatsAppUrl(resolveWhatsAppNumber(s), `Hello ${s.businessName}! I have a question about your brownies.`);
  const rows = [
    s.contactPhone && { icon: <Phone size={18} aria-hidden />, label: "Phone", node: <a href={`tel:${s.contactPhone.replace(/[^\d+]/g, "")}`} className="link-underline">{s.contactPhone}</a> },
    s.contactEmail && { icon: <Mail size={18} aria-hidden />, label: "Email", node: <a href={`mailto:${s.contactEmail}`} className="link-underline">{s.contactEmail}</a> },
    s.address && { icon: <MapPin size={18} aria-hidden />, label: "Address", node: <span>{s.address}</span> },
    s.instagramUrl && { icon: <InstagramIcon width={18} height={18} />, label: "Instagram", node: <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="link-underline">Follow us</a> },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; node: React.ReactNode }[];

  return (
    <>
      <PageHero eyebrow="Contact" title="Let’s talk brownies" sub="The fastest way to order or ask a question is WhatsApp." />
      <section className="container-narrow py-16 text-center">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg"><WhatsAppIcon width={20} height={20} /> Message us on WhatsApp</a>
        ) : (
          <p className="border border-dashed border-line bg-white px-6 py-8 text-muted">Our contact details are being set up and will appear here soon.</p>
        )}
        {rows.length > 0 && (
          <dl className="mx-auto mt-12 grid max-w-md gap-6 text-left">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-4">
                <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-full border border-gold text-gold-deep">{r.icon}</span>
                <div><dt className="eyebrow mb-0.5">{r.label}</dt><dd>{r.node}</dd></div>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-12 text-sm text-muted">Serving Bangalore. Please share your area when you message us so we can confirm delivery.</p>
      </section>
    </>
  );
}
