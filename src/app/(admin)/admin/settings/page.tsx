import type { Metadata } from "next";
import { getSettings } from "@/lib/config";
import { AdminTitle } from "@/components/admin/bits";
import { AdminForm } from "@/components/admin/admin-form";
import { ACheck, AField, Panel, adminInput } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/image-field";
import { saveSettings } from "@/actions/admin";
import { listAvailableProviders } from "@/lib/payments/providers";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings() {
  const s = await getSettings();
  const rzp = listAvailableProviders({ codEnabled: false }).some((p) => p.id === "RAZORPAY");
  const text = (key: keyof typeof s, label: string, opts?: { hint?: string; type?: string; placeholder?: string }) => (
    <AField id={key} label={label} hint={opts?.hint}>
      <input id={key} name={key} type={opts?.type ?? "text"} defaultValue={s[key] as string} placeholder={opts?.placeholder} className={adminInput} />
    </AField>
  );
  const area = (key: keyof typeof s, label: string, rows = 4, hint?: string) => (
    <AField id={key} label={label} hint={hint}>
      <textarea id={key} name={key} rows={rows} defaultValue={s[key] as string} className={adminInput} />
    </AField>
  );
  return (
    <>
      <AdminTitle title="Settings" />
      <AdminForm action={saveSettings} submitLabel="Save settings">
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Brand">
            <div className="space-y-4">
              {text("brandName", "Brand name")}
              {text("tagline", "Tagline")}
              <AField id="logo" label="Logo"><ImageField name="logo" label="Logo" multiple={false} defaultValue={s.logo} /></AField>
              <AField id="heroImage" label="Homepage hero photo" hint="Use your best brownie photo. Also used for social sharing."><ImageField name="heroImage" label="Hero image" multiple={false} defaultValue={s.heroImage} /></AField>
              <AField id="signatureImage" label="Signature section photo"><ImageField name="signatureImage" label="Signature image" multiple={false} defaultValue={s.signatureImage} /></AField>
              {text("signatureProductSlug", "Signature product slug", { hint: "e.g. classic-fudge-brownie. Blank = newest featured product." })}
            </div>
          </Panel>

          <Panel title="Contact">
            <div className="space-y-4">
              {text("phone", "Phone")}
              {text("whatsapp", "WhatsApp number", { hint: "Digits with country code, e.g. 91XXXXXXXXXX. The NEXT_PUBLIC_WHATSAPP_NUMBER env var takes priority." })}
              {text("email", "Email", { type: "email" })}
              {area("address", "Address", 3)}
              {area("businessHours", "Business hours", 3)}
              {text("mapEmbedUrl", "Google Maps embed URL", { hint: "Starts with https://www.google.com/maps/embed" })}
              {text("instagram", "Instagram URL", { placeholder: "https://instagram.com/…" })}
              {text("facebook", "Facebook URL", { placeholder: "https://facebook.com/…" })}
              {text("fssai", "FSSAI licence number", { hint: "Shown in the footer only if filled." })}
            </div>
          </Panel>

          <Panel title="Delivery & payments">
            <div className="space-y-4">
              {text("deliveryFee", "Delivery fee (₹)", { type: "number" })}
              {text("freeDeliveryThreshold", "Free delivery above (₹)", { type: "number", hint: "0 = no free-delivery offer." })}
              {text("minimumOrder", "Minimum order (₹)", { type: "number", hint: "0 = no minimum." })}
              {text("currency", "Currency")}
              {area("deliveryAreas", "Delivery areas", 3, "Shown at checkout and on product pages.")}
              {text("expectedDelivery", "Expected delivery message", { hint: "e.g. what customers should expect after ordering. Shown only if filled." })}
              <ACheck name="sameDayDelivery" label="Same-day delivery available" defaultChecked={s.sameDayDeliveryBool} />
              <ACheck name="codEnabled" label="Accept Cash on Delivery" defaultChecked={s.codEnabledBool} />
              <p className="rounded-xl bg-cream px-4 py-3 text-sm">
                Online payment (Razorpay): <strong>{rzp ? "enabled" : "not configured"}</strong>
                {rzp ? "" : ". Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment to enable it."}
              </p>
            </div>
          </Panel>

          <Panel title="SEO">
            <div className="space-y-4">
              {text("seoTitle", "Homepage title")}
              {area("seoDescription", "Meta description", 3)}
            </div>
          </Panel>

          <Panel title="Pages & policies" className="xl:col-span-2">
            <p className="mb-4 text-sm text-ink/70">Write these yourself. Empty policies show a neutral &ldquo;being finalised&rdquo; message instead of made-up terms.</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {area("aboutStory", "About / brand story", 6)}
              {area("policyShipping", "Shipping policy", 6)}
              {area("policyRefund", "Refund & cancellation policy", 6)}
              {area("policyPrivacy", "Privacy policy", 6)}
              {area("policyTerms", "Terms & conditions", 6)}
            </div>
          </Panel>
        </div>
      </AdminForm>
    </>
  );
}
