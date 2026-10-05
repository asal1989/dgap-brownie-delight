import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

export const metadata: Metadata = { title: "Refund & Cancellation Policy", alternates: { canonical: "/refund-policy" } };

export default function Page() {
  return <PolicyPage title="Refund & Cancellation Policy" settingKey="policyRefund" path="/refund-policy" />;
}
