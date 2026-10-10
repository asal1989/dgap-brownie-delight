import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings, resolveWhatsAppNumber } from "@/lib/settings";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { whatsAppUrl } from "@/lib/whatsapp";

export async function SiteFooter() {
  const s = await getSettings();
  const wa = whatsAppUrl(resolveWhatsAppNumber(s), `Hello ${s.businessName}! I have a question.`);
  const contacts = [
    s.contactPhone && { icon: <Phone size={16} aria-hidden />, node: <a href={`tel:${s.contactPhone.replace(/[^\d+]/g, "")}`}>{s.contactPhone}</a> },
    s.contactEmail && { icon: <Mail size={16} aria-hidden />, node: <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a> },
    s.address && { icon: <MapPin size={16} aria-hidden />, node: <span>{s.address}</span> },
  ].filter(Boolean) as { icon: React.ReactNode; node: React.ReactNode }[];

  return (
    <footer className="on-dark mt-auto bg-forest-deep pt-20 text-[0.94rem] text-ivory/75">
      <div className="container-x grid gap-12 pb-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="font-serif text-[2rem] leading-none text-ivory">
            DGAP <em className="text-gold">Brownie Delight</em>
          </p>
          <p className="mt-3 max-w-xs">{s.tagline}</p>
          <div className="mt-5 flex gap-1">
            {s.instagramUrl && (
              <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in a new tab)" className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-gold">
                <InstagramIcon width={22} height={22} />
              </a>
            )}
            {s.facebookUrl && (
              <a href={s.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook (opens in a new tab)" className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-gold">
                <FacebookIcon width={22} height={22} />
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (opens in a new tab)" className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-gold">
                <WhatsAppIcon width={22} height={22} />
              </a>
            )}
          </div>
        </div>

        <nav aria-label="Explore">
          <h2 className="eyebrow mb-5 !text-gold !font-sans !text-[0.72rem]">Explore</h2>
          <ul className="space-y-2.5">
            {[["/shop", "Shop all brownies"], ["/gift-boxes", "Gift boxes"], ["/build-your-box", "Build your box"], ["/about", "Our story"], ["/contact", "Contact"], ["/track", "Track an order"]].map(([href, label]) => (
              <li key={href}><Link href={href} className="transition-colors hover:text-gold">{label}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Customer care">
          <h2 className="eyebrow mb-5 !text-gold !font-sans !text-[0.72rem]">Customer care</h2>
          <ul className="space-y-2.5">
            {[["/shipping", "Shipping & delivery"], ["/refunds", "Refunds & cancellation"], ["/privacy", "Privacy policy"], ["/terms", "Terms & conditions"]].map(([href, label]) => (
              <li key={href}><Link href={href} className="transition-colors hover:text-gold">{label}</Link></li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-5 !text-gold !font-sans !text-[0.72rem]">Get in touch</h2>
          {contacts.length > 0 ? (
            <ul className="space-y-3">
              {contacts.map((c, i) => (
                <li key={i} className="flex items-start gap-3 [&_a]:transition-colors [&_a:hover]:text-gold">
                  <span className="mt-1 text-gold">{c.icon}</span>
                  {c.node}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Contact details will be shown here soon.{" "}
              <Link href="/contact" className="text-gold underline-offset-4 hover:underline">Contact page</Link>
            </p>
          )}
          <p className="mt-4 text-sm text-ivory/60">Baked and delivered in Bangalore. Delivery areas and timings are confirmed when you order.</p>
        </div>
      </div>
      <div className="border-t border-gold/25">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 py-5 text-[0.8rem] text-ivory/60">
          <p>© {new Date().getFullYear()} {s.businessName}. All rights reserved.</p>
          {s.tax.enabled && s.tax.gstin && <p>GSTIN: {s.tax.gstin}</p>}
        </div>
      </div>
    </footer>
  );
}
