"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Menu, Search, User, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { CartButton } from "@/components/cart/cart-button";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?flag=best", label: "Best Sellers" },
  { href: "/shop?flag=gift", label: "Gift Boxes" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ brandName, logo }: { brandName: string; logo: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-50 transition-all duration-300",
        scrolled ? "bg-cream/90 shadow-[0_1px_0_var(--beige)] backdrop-blur-md" : "bg-cream",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Logo logo={logo} brandName={brandName} />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname === l.href.split("?")[0] && !l.href.includes("?");
            return (
              <Link
                key={l.label}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-beige/60 xl:px-4",
                  active ? "text-caramel" : "text-choc",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="grid size-11 place-items-center rounded-full text-choc hover:bg-beige/50"
          >
            <Search className="size-6" aria-hidden />
          </button>
          <Link href="/account" aria-label="Account" className="hidden size-11 place-items-center rounded-full text-choc hover:bg-beige/50 lg:grid">
            <User className="size-6" aria-hidden />
          </Link>
          <CartButton />
          <ButtonLink href="/shop" size="sm" className="ml-2 hidden lg:inline-flex">
            Order now
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="grid size-11 place-items-center rounded-full text-choc hover:bg-beige/50 lg:hidden"
          >
            <Menu className="size-6" aria-hidden />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-espresso/60" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="animate-fade-up absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-espresso p-6 text-cream">
            <div className="flex items-center justify-between">
              <Logo logo={logo} brandName={brandName} tone="light" />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="grid size-11 place-items-center rounded-full hover:bg-white/10">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <nav aria-label="Mobile" className="mt-8 flex flex-1 flex-col">
              {LINKS.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-white/10 py-4 font-display text-2xl hover:text-gold"
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/account" onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-4 font-display text-2xl hover:text-gold">
                My account
              </Link>
            </nav>
            <ButtonLink href="/shop" variant="caramel" size="lg" onClick={() => setMenuOpen(false)}>
              Order now
            </ButtonLink>
          </div>
        </div>
      ) : null}

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </header>
  );
}
