import Link from "next/link";
import { Mail, MapPin, Phone, MessageCircle, Clock, ShieldCheck } from "lucide-react";
import { Instagram, Facebook } from "@/components/ui/social-icons";
import { Logo } from "@/components/layout/logo";
import { getSettings } from "@/lib/config";
import { getActiveCategories } from "@/lib/db/queries";
import { whatsappLink } from "@/lib/whatsapp";

const POLICIES = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/refund-policy", label: "Refund & Cancellation" },
];

export async function Footer() {
  const [s, categories] = await Promise.all([getSettings(), getActiveCategories()]);
  const year = new Date().getFullYear();
  const colTitle = "mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold";
  const link = "text-sm text-cream/75 transition hover:text-white";

  return (
    <footer className="no-print mt-24 bg-espresso text-cream">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo logo={s.logo} brandName={s.brandName} tone="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/75">
            {s.tagline}. Freshly baked. Deeply chocolatey.
          </p>
          <div className="mt-5 flex gap-2">
            {s.instagram ? (
              <a href={s.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-gold hover:text-espresso">
                <Instagram className="size-5" aria-hidden />
              </a>
            ) : null}
            {s.facebook ? (
              <a href={s.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-gold hover:text-espresso">
                <Facebook className="size-5" aria-hidden />
              </a>
            ) : null}
            {s.whatsappDigits ? (
              <a href={whatsappLink(s.whatsappDigits, `Hi ${s.brandName}!`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-gold hover:text-espresso">
                <MessageCircle className="size-5" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>

        <nav aria-label="Shop links">
          <h2 className={colTitle}>Shop</h2>
          <ul className="space-y-2.5">
            <li><Link className={link} href="/shop">All brownies</Link></li>
            <li><Link className={link} href="/shop?flag=best">Best sellers</Link></li>
            <li><Link className={link} href="/shop?flag=gift">Gift boxes</Link></li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link className={link} href={`/categories/${c.slug}`}>{c.name}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Customer support">
          <h2 className={colTitle}>Support</h2>
          <ul className="space-y-2.5">
            <li><Link className={link} href="/faq">FAQs</Link></li>
            <li><Link className={link} href="/contact">Contact us</Link></li>
            <li><Link className={link} href="/about">Our story</Link></li>
            <li><Link className={link} href="/account/orders">My orders</Link></li>
            {POLICIES.map((p) => (
              <li key={p.href}><Link className={link} href={p.href}>{p.label}</Link></li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={colTitle}>Contact</h2>
          <ul className="space-y-3 text-sm text-cream/75">
            {s.phone ? <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /><a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-white">{s.phone}</a></li> : null}
            {s.email ? <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /><a href={`mailto:${s.email}`} className="break-all hover:text-white">{s.email}</a></li> : null}
            {s.address ? <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /><span className="whitespace-pre-line">{s.address}</span></li> : null}
            {s.businessHours ? <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /><span className="whitespace-pre-line">{s.businessHours}</span></li> : null}
            {!s.phone && !s.email && !s.address && !s.whatsappDigits ? (
              <li><Link href="/contact" className="hover:text-white">Send us a message</Link></li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {s.brandName}. All rights reserved.</p>
          <p className="flex items-center gap-3">
            {s.fssai ? <span>FSSAI Lic. No. {s.fssai}</span> : null}
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-gold" aria-hidden />Secure checkout</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
