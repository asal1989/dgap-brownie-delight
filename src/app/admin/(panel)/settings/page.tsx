import { AdminHeader } from "@/components/admin/admin-ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePermission } from "@/lib/auth/guards";
import { paymentMode } from "@/lib/env";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings:write");
  const settings = await getSettings();
  return (
    <>
      <AdminHeader title="Settings" sub="Business details, ordering, delivery, tax and policies. Changes apply to the storefront immediately and are recorded in the audit log." />
      <SettingsForm settings={settings} paymentModeLabel={paymentMode()} />
    </>
  );
}
