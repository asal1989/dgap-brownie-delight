import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { getSettings, toPublicConfig } from "@/lib/config";
import { siteUrl } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

// Settings and catalogue live in the database and change from /admin, so pages render per request.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.seoTitle, template: `%s | ${s.brandName}` },
    description: s.seoDescription,
    applicationName: s.brandName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: s.brandName,
      title: s.seoTitle,
      description: s.seoDescription,
      url: siteUrl(),
      locale: "en_IN",
      ...(s.heroImage ? { images: [{ url: s.heroImage, alt: s.brandName }] } : {}),
    },
    twitter: { card: "summary_large_image", title: s.seoTitle, description: s.seoDescription },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#2b160f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en-IN" className={`${playfair.variable} ${manrope.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers config={toPublicConfig(settings)}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
