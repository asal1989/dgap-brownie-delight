import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/config";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/layout/contact-form";
import { ButtonLink } from "@/components/ui/button";
import { Instagram } from "@/components/ui/social-icons";
import { buildEnquiryMessage, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions, gift boxes or bulk orders? Get in touch with DGAP Brownie Delight.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const map = s.mapEmbedUrl.startsWith("https://www.google.com/maps/embed") ? s.mapEmbedUrl : "";
  const row = "flex gap-3";
  const icon = "mt-1 size-5 shrink-0 text-caramel";
  return (
    <>
      <PageHeader title="Get in touch" subtitle="Questions, gift boxes or bulk orders? We'd love to hear from you." crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-2 lg:py-16">
        <div className="space-y-6">
          <ul className="space-y-5 rounded-3xl border border-beige bg-white p-6 sm:p-8">
            {s.whatsappDigits ? (
              <li className={row}><MessageCircle className={icon} aria-hidden /><div><p className="font-semibold text-choc">WhatsApp</p>
                <ButtonLink href={whatsappLink(s.whatsappDigits, buildEnquiryMessage(s.brandName))} external size="sm" className="mt-2">Chat with us</ButtonLink></div></li>
            ) : null}
            {s.phone ? <li className={row}><Phone className={icon} aria-hidden /><div><p className="font-semibold text-choc">Phone</p><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="text-ink/75 hover:underline">{s.phone}</a></div></li> : null}
            {s.email ? <li className={row}><Mail className={icon} aria-hidden /><div><p className="font-semibold text-choc">Email</p><a href={`mailto:${s.email}`} className="break-all text-ink/75 hover:underline">{s.email}</a></div></li> : null}
            {s.address ? <li className={row}><MapPin className={icon} aria-hidden /><div><p className="font-semibold text-choc">Address</p><p className="whitespace-pre-line text-ink/75">{s.address}</p></div></li> : null}
            {s.businessHours ? <li className={row}><Clock className={icon} aria-hidden /><div><p className="font-semibold text-choc">Business hours</p><p className="whitespace-pre-line text-ink/75">{s.businessHours}</p></div></li> : null}
            {s.instagram ? <li className={row}><Instagram className={icon} aria-hidden /><div><p className="font-semibold text-choc">Instagram</p><a href={s.instagram} target="_blank" rel="noopener noreferrer" className="break-all text-ink/75 hover:underline">{s.instagram.replace(/^https?:\/\/(www\.)?/, "")}</a></div></li> : null}
            {!s.whatsappDigits && !s.phone && !s.email && !s.address ? <li className="text-ink/70">Use the form and we&apos;ll get back to you.</li> : null}
          </ul>
          {map ? (
            <iframe title={`${s.brandName} location map`} src={map} className="aspect-[4/3] w-full rounded-3xl border border-beige" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : null}
        </div>
        <ContactForm />
      </div>
    </>
  );
}
