import { getSettings, type SettingKey } from "@/lib/config";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";

/** Policy text is written by the business in Admin → Settings. Nothing is invented here. */
export async function PolicyPage({ title, settingKey, path }: { title: string; settingKey: SettingKey; path: string }) {
  const s = await getSettings();
  const body = s[settingKey].trim();
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: "Home", href: "/" }, { label: title }]} />
      <div className="container-page max-w-3xl py-12 lg:py-16">
        {body ? (
          <div className="whitespace-pre-line text-lg leading-relaxed text-ink/80">{body}</div>
        ) : (
          <div className="rounded-3xl border border-dashed border-beige p-8 text-center" data-path={path}>
            <p className="text-lg text-ink/70">This policy is being finalised. For any questions in the meantime, please reach out.</p>
            <ButtonLink href="/contact" className="mt-6">Contact us</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
