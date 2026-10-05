import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

export const metadata: Metadata = { title: "Shipping Policy", alternates: { canonical: "/shipping-policy" } };

export default function Page() {
  return <PolicyPage title="Shipping Policy" settingKey="policyShipping" path="/shipping-policy" />;
}
