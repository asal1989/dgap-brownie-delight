"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/gift-boxes", label: "Gift Boxes" },
  { href: "/build-your-box", label: "Build Your Box" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact" },
] as const;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

export function HeaderClient({ businessName, logoUrl, signedIn }: { businessName: string; logoUrl: string; signedIn: boolean }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { count, ready } = useCart();
  // The menu is "open for a path": navigating anywhere else closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenFor((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu on navigation; lock body scroll while it is open; Escape closes and returns focus.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenFor(null);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const f = [...panelRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])")];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <header className={`on-dark sticky top-0 z-50 border-b border-gold/35 bg-forest transition-shadow duration-300 ${scrolled ? "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]" : ""}`}>
      <div className={`container-x flex items-center justify-between gap-4 transition-[height] duration-300 ${scrolled ? "h-[68px]" : "h-[84px]"}`}>
        <Link href="/" className="flex items-center gap-3" aria-label={`${businessName} home`}>
          <Image src={logoUrl} alt="" width={60} height={60} priority className={`rounded-[3px] ring-1 ring-gold/70 transition-all duration-300 ${scrolled ? "size-[46px]" : "size-[56px]"}`} />
          <span className="font-serif text-[1.35rem] font-semibold leading-none tracking-[0.01em] text-gold max-[359px]:hidden">
            DGAP <em className="font-medium">Brownie Delight</em>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 min-[1060px]:flex">
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2.5 text-[0.74rem] font-medium uppercase tracking-[0.16em] transition-colors ${active ? "text-gold" : "text-ivory hover:text-gold"}`}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-x-3 -bottom-0.5 h-px bg-gold"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link href={signedIn ? "/account" : "/account/login"} className="grid size-11 place-items-center rounded-full text-ivory transition-colors hover:bg-white/10 hover:text-gold" aria-label={signedIn ? "My account" : "Sign in"}>
            <User size={21} aria-hidden />
          </Link>
          <Link href="/cart" className="relative grid size-11 place-items-center rounded-full text-ivory transition-colors hover:bg-white/10 hover:text-gold" aria-label={`Cart, ${ready ? count : 0} item${count === 1 ? "" : "s"}`}>
            <ShoppingBag size={21} aria-hidden />
            {ready && count > 0 && (
              <motion.span
                key={count}
                initial={reduce ? false : { scale: 1.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="absolute right-0.5 top-0.5 grid min-w-[19px] place-items-center rounded-full bg-gold px-1 text-[0.68rem] font-bold leading-[19px] text-forest-deep"
              >
                {count}
              </motion.span>
            )}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="grid size-11 place-items-center rounded-full text-ivory transition-colors hover:bg-white/10 hover:text-gold min-[1060px]:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[84px] z-40 min-[1060px]:hidden">
          <button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-forest-deep/70" onClick={() => setOpen(false)} />
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            initial={reduce ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-y-0 right-0 w-[min(86vw,340px)] overflow-y-auto bg-forest-deep px-7 py-8"
          >
            <nav aria-label="Mobile">
              <ul>
                {NAV_LINKS.map((l) => (
                  <li key={l.href} className="border-b border-gold/25">
                    <Link href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined} className={`block py-4 font-serif text-[1.8rem] leading-tight ${isActive(pathname, l.href) ? "text-gold" : "text-ivory"}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        </div>
      )}
    </header>
  );
}
