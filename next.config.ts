import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Render <title>/<meta> inside <head> for every client (no streamed metadata): better for SEO tools & crawlers.
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
    // Admins may paste image URLs from their own CDN / Instagram exports.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
