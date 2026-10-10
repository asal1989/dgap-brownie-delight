"use client";

import { useState } from "react";
import { useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { saveSettingsAction } from "@/actions/admin/misc";
import { paiseToRupeesInput, rupeesToPaise } from "@/lib/money";
import type { Settings } from "@/lib/settings";

type Form = {
  businessName: string; tagline: string; logoUrl: string; whatsappNumber: string; contactEmail: string; contactPhone: string; address: string;
  instagramUrl: string; facebookUrl: string; announcementEnabled: boolean; announcementMessage: string;
  orderingEnabled: boolean; orderingClosedMessage: string; codEnabled: boolean; onlinePaymentEnabled: boolean; orderPrefix: string;
  deliveryOptions: { id: string; label: string; description: string; fee: string; enabled: boolean }[];
  deliveryZones: { id: string; name: string; postalPrefixes: string; fee: string }[];
  restrictToZones: boolean; freeDeliveryThreshold: string;
  taxEnabled: boolean; taxPercent: string; taxInclusive: boolean; taxLabel: string; gstin: string;
  policyShipping: string; policyRefunds: string; policyPrivacy: string; policyTerms: string;
};

const toForm = (s: Settings): Form => ({
  businessName: s.businessName, tagline: s.tagline, logoUrl: s.logoUrl, whatsappNumber: s.whatsappNumber, contactEmail: s.contactEmail, contactPhone: s.contactPhone, address: s.address,
  instagramUrl: s.instagramUrl, facebookUrl: s.facebookUrl, announcementEnabled: s.announcement.enabled, announcementMessage: s.announcement.message,
  orderingEnabled: s.orderingEnabled, orderingClosedMessage: s.orderingClosedMessage, codEnabled: s.codEnabled, onlinePaymentEnabled: s.onlinePaymentEnabled, orderPrefix: s.orderPrefix,
  deliveryOptions: s.deliveryOptions.map((o) => ({ id: o.id, label: o.label, description: o.description, fee: paiseToRupeesInput(o.feePaise) || "0", enabled: o.enabled })),
  deliveryZones: s.deliveryZones.map((z) => ({ id: z.id, name: z.name, postalPrefixes: z.postalPrefixes.join(", "), fee: paiseToRupeesInput(z.feePaise) || "0" })),
  restrictToZones: s.restrictToZones, freeDeliveryThreshold: paiseToRupeesInput(s.freeDeliveryThresholdPaise),
  taxEnabled: s.tax.enabled, taxPercent: String(s.tax.rateBp / 100), taxInclusive: s.tax.inclusive, taxLabel: s.tax.label, gstin: s.tax.gstin,
  policyShipping: s.policies.shipping, policyRefunds: s.policies.refunds, policyPrivacy: s.policies.privacy, policyTerms: s.policies.terms,
});

/** Convert the form (rupees as text) into the validated settings shape (integer paise). Returns an error string on bad input. */
function toSettings(f: Form): { value: unknown } | { error: string } {
  const money = (label: string, v: string) => { const p = rupeesToPaise(v || "0"); return p === null ? `${label}: enter a plain rupee amount` : p; };
  const options = [];
  for (const o of f.deliveryOptions) {
    const fee = money(`Delivery option "${o.label}" fee`, o.fee);
    if (typeof fee === "string") return { error: fee };
    options.push({ id: o.id, label: o.label, description: o.description, feePaise: fee, enabled: o.enabled });
  }
  const zones = [];
  for (const z of f.deliveryZones) {
    const fee = money(`Zone "${z.name}" fee`, z.fee);
    if (typeof fee === "string") return { error: fee };
    zones.push({ id: z.id, name: z.name, postalPrefixes: z.postalPrefixes.split(",").map((p) => p.trim()).filter(Boolean), feePaise: fee });
  }
  const threshold = f.freeDeliveryThreshold.trim() ? money("Free delivery threshold", f.freeDeliveryThreshold) : null;
  if (typeof threshold === "string") return { error: threshold };
  const pct = Number(f.taxPercent || 0);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: "Tax rate must be between 0 and 100" };
  return {
    value: {
      businessName: f.businessName, tagline: f.tagline, logoUrl: f.logoUrl, whatsappNumber: f.whatsappNumber.replace(/\D/g, ""), contactEmail: f.contactEmail, contactPhone: f.contactPhone, address: f.address,
      instagramUrl: f.instagramUrl, facebookUrl: f.facebookUrl, announcement: { enabled: f.announcementEnabled, message: f.announcementMessage },
      orderingEnabled: f.orderingEnabled, orderingClosedMessage: f.orderingClosedMessage, codEnabled: f.codEnabled, onlinePaymentEnabled: f.onlinePaymentEnabled, currency: "INR", orderPrefix: f.orderPrefix.toUpperCase(),
      deliveryOptions: options, deliveryZones: zones, restrictToZones: f.restrictToZones, freeDeliveryThresholdPaise: threshold,
      tax: { enabled: f.taxEnabled, rateBp: Math.round(pct * 100), inclusive: f.taxInclusive, label: f.taxLabel, gstin: f.gstin },
      policies: { shipping: f.policyShipping, refunds: f.policyRefunds, privacy: f.policyPrivacy, terms: f.policyTerms },
    },
  };
}

const Section = ({ title, children, sub }: { title: string; children: React.ReactNode; sub?: string }) => (
  <fieldset className="border border-line bg-white p-6">
    <legend className="px-2 font-serif text-2xl text-forest">{title}</legend>
    {sub && <p className="mb-4 text-sm text-muted">{sub}</p>}
    <div className="space-y-4">{children}</div>
  </fieldset>
);

type Reg = UseFormRegister<Form>;

function T({ r, name, label, ...rest }: { r: Reg; name: keyof Form & string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field"><span className="label">{label}</span><input className="input" {...r(name as never)} {...rest} /></label>
  );
}

function C({ r, name, label }: { r: Reg; name: keyof Form & string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-forest" {...r(name as never)} /> {label}</label>
  );
}

export function SettingsForm({ settings, paymentModeLabel }: { settings: Settings; paymentModeLabel: string }) {
  const { register, control, handleSubmit } = useForm<Form>({ defaultValues: toForm(settings) });
  const options = useFieldArray({ control, name: "deliveryOptions" });
  const zones = useFieldArray({ control, name: "deliveryZones" });
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (values: Form) => {
    const converted = toSettings(values);
    if ("error" in converted) return setResult({ ok: false, message: converted.error });
    setSaving(true);
    const r = await saveSettingsAction(converted.value);
    setSaving(false);
    setResult(r ?? { ok: false, message: "No response" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate aria-label="Settings">
      <div role="status" aria-live="polite" className={`min-h-6 text-sm ${result?.ok ? "text-success" : "text-danger"}`} data-testid="settings-result">{result?.message}</div>

      <Section title="Ordering" sub="The shop stays closed to online orders until you turn this on. Set prices and delivery first.">
        <C r={register} name="orderingEnabled" label="Accept online orders" />
        <T r={register} name="orderingClosedMessage" label="Message shown while ordering is closed" maxLength={240} />
        <C r={register} name="onlinePaymentEnabled" label="Allow online payment" />
        <C r={register} name="codEnabled" label="Allow cash on delivery" />
        <p className="text-xs text-muted">Payment provider mode (set by server environment): <strong>{paymentModeLabel}</strong>. Only “razorpay” takes real payments.</p>
        <T r={register} name="orderPrefix" label="Order number prefix (capitals and numbers)" maxLength={8} />
      </Section>

      <Section title="Business">
        <div className="grid gap-4 md:grid-cols-2"><T r={register} name="businessName" label="Business name" /><T r={register} name="tagline" label="Tagline" /><T r={register} name="logoUrl" label="Logo image path or URL" /><T r={register} name="whatsappNumber" label="WhatsApp number (digits with country code)" placeholder="919876543210" inputMode="numeric" /><T r={register} name="contactEmail" label="Contact email" type="email" /><T r={register} name="contactPhone" label="Contact phone" /></div>
        <T r={register} name="address" label="Address" /><div className="grid gap-4 md:grid-cols-2"><T r={register} name="instagramUrl" label="Instagram URL" placeholder="https://www.instagram.com/…" /><T r={register} name="facebookUrl" label="Facebook URL" /></div>
        <C r={register} name="announcementEnabled" label="Show announcement bar" /><T r={register} name="announcementMessage" label="Announcement message" maxLength={160} />
      </Section>

      <Section title="Delivery options and charges" sub="Fees are in rupees. A zone overrides the option fee when the customer's postal code starts with one of its prefixes.">
        {options.fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 border border-line bg-ivory p-4 md:grid-cols-[1fr_1.4fr_1.6fr_7rem_auto]">
            <label className="field"><span className="label">ID</span><input className="input" {...register(`deliveryOptions.${i}.id`)} /></label>
            <label className="field"><span className="label">Name</span><input className="input" {...register(`deliveryOptions.${i}.label`)} /></label>
            <label className="field"><span className="label">Description</span><input className="input" {...register(`deliveryOptions.${i}.description`)} /></label>
            <label className="field"><span className="label">Fee (₹)</span><input className="input" inputMode="decimal" {...register(`deliveryOptions.${i}.fee`)} data-testid={`option-fee-${i}`} /></label>
            <div className="flex items-end gap-3 pb-2 text-sm"><label className="flex items-center gap-1"><input type="checkbox" className="accent-forest" {...register(`deliveryOptions.${i}.enabled`)} /> On</label>{options.fields.length > 1 && <button type="button" onClick={() => options.remove(i)} className="underline text-danger">Remove</button>}</div>
          </div>
        ))}
        <button type="button" onClick={() => options.append({ id: `option-${options.fields.length + 1}`, label: "", description: "", fee: "0", enabled: true })} className="btn btn-outline btn-sm">Add option</button>

        <h3 className="pt-4 font-serif text-xl">Delivery zones</h3>
        {zones.fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 border border-line bg-ivory p-4 md:grid-cols-[1fr_1.4fr_2fr_7rem_auto]">
            <label className="field"><span className="label">ID</span><input className="input" {...register(`deliveryZones.${i}.id`)} /></label>
            <label className="field"><span className="label">Name</span><input className="input" {...register(`deliveryZones.${i}.name`)} /></label>
            <label className="field"><span className="label">Postal prefixes (comma separated)</span><input className="input" placeholder="5600, 5601" {...register(`deliveryZones.${i}.postalPrefixes`)} /></label>
            <label className="field"><span className="label">Fee (₹)</span><input className="input" inputMode="decimal" {...register(`deliveryZones.${i}.fee`)} /></label>
            <div className="flex items-end pb-2 text-sm"><button type="button" onClick={() => zones.remove(i)} className="underline text-danger">Remove</button></div>
          </div>
        ))}
        <button type="button" onClick={() => zones.append({ id: `zone-${zones.fields.length + 1}`, name: "", postalPrefixes: "", fee: "0" })} className="btn btn-outline btn-sm">Add zone</button>
        <C r={register} name="restrictToZones" label="Only deliver inside the zones above" />
        <T r={register} name="freeDeliveryThreshold" label="Free delivery from (₹, leave empty for none)" inputMode="decimal" />
      </Section>

      <Section title="Tax" sub="Only enable this once you know the tax rules that apply to your business. Inclusive tax is shown inside the price; exclusive tax is added at checkout.">
        <C r={register} name="taxEnabled" label="Calculate tax" /><div className="grid gap-4 md:grid-cols-3"><T r={register} name="taxLabel" label="Tax name" /><T r={register} name="taxPercent" label="Rate (%)" inputMode="decimal" /><T r={register} name="gstin" label="GSTIN (shown in the footer)" /></div><C r={register} name="taxInclusive" label="Prices already include tax" />
      </Section>

      <Section title="Policies" sub="Leave a policy empty to show the standard factual text. Blank lines separate paragraphs; start a line with “# ” for a heading.">
        {([["policyShipping", "Shipping and delivery"], ["policyRefunds", "Refunds and cancellation"], ["policyPrivacy", "Privacy"], ["policyTerms", "Terms and conditions"]] as const).map(([n, l]) => (
          <label key={n} className="field"><span className="label">{l}</span><textarea className="textarea" rows={5} {...register(n)} /></label>
        ))}
      </Section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-ivory/95 px-4 py-4 sm:-mx-8 sm:px-8"><button type="submit" disabled={saving} className="btn btn-primary btn-lg" data-testid="save-settings">{saving ? "Saving…" : "Save settings"}</button></div>
    </form>
  );
}
