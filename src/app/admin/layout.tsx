import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | DGAP Admin" }, robots: { index: false, follow: false } };

// Admin pages always render per request and are never cached or indexed.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-screen bg-ivory">{children}</div>;
}
