import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = { themeColor: "#183A2C", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "DGAP Brownie Delight | Where Every Bite Feels Homemade", template: "%s | DGAP Brownie Delight" },
  description:
    "Premium artisan brownies from Bangalore: Classic Fudgy, Double and Triple Chocolate, Walnut, Ragi and Wheat brownies, assorted boxes and gift boxes.",
  applicationName: "DGAP Brownie Delight",
  openGraph: { type: "website", siteName: "DGAP Brownie Delight", locale: "en_IN", images: ["/images/hero-fudgie.jpg"] },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/images/logo-192.png", apple: "/images/apple-touch-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
