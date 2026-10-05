import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

export default function Page() {
  return <PolicyPage title="Privacy Policy" settingKey="policyPrivacy" path="/privacy-policy" />;
}
