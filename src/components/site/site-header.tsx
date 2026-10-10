import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { HeaderClient } from "./header-client";

export async function SiteHeader() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <>
      {settings.announcement.enabled && settings.announcement.message && (
        <div className="on-dark bg-espresso px-4 py-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.28em] text-gold" role="region" aria-label="Announcement">
          {settings.announcement.message}
        </div>
      )}
      <HeaderClient businessName={settings.businessName} logoUrl={settings.logoUrl} signedIn={Boolean(user)} />
    </>
  );
}
