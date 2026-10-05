import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function Page() {
  return <PolicyPage title="Terms & Conditions" settingKey="policyTerms" path="/terms" />;
}
