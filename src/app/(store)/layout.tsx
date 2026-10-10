import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

// Every storefront page reads the database or the visitor's cookies, so render per request.
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </Providers>
  );
}
