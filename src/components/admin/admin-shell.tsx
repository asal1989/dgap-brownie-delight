"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Boxes, ExternalLink, HelpCircle, LayoutGrid, LogOut, Mail, Menu, MessageSquareQuote, Package, Settings, Tag, Users, X } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", active ? "bg-gold text-espresso" : "text-cream/80 hover:bg-white/10")}
          >
            <Icon className="size-5" aria-hidden />
            {label}
            {label === "Messages" && unread > 0 ? <span className="ml-auto rounded-full bg-caramel px-2 text-xs text-white">{unread}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminFrame({ name, unread, children }: { name: string; unread: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between px-5">
        <span className="font-display text-lg font-bold tracking-wide text-gold">DGAP Admin</span>
        <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" aria-hidden /></button>
      </div>
      <AdminSidebar unread={unread} />
      <div className="border-t border-white/10 p-3">
        <Link href="/" target="_blank" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-cream/70 hover:bg-white/10"><ExternalLink className="size-5" aria-hidden />View store</Link>
        <form action={logoutAction}>
          <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-cream/70 hover:bg-white/10"><LogOut className="size-5" aria-hidden />Sign out</button>
        </form>
      </div>
    </>
  );
  return (
    <div className="theme-light min-h-dvh bg-page text-fg lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col bg-espresso text-cream lg:flex">{sidebar}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-espresso text-cream">{sidebar}</aside>
        </div>
      ) : null}
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-panel/90 px-4 backdrop-blur sm:px-6">
          <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-panel2/60 lg:hidden" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu className="size-6" aria-hidden /></button>
          <p className="text-sm text-fg/70">Signed in as <strong className="text-heading">{name}</strong></p>
        </header>
        <main id="main" className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
