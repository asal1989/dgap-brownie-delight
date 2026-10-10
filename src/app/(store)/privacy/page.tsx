import { PolicyPage, policyMetadata } from "@/components/store/policy-page";

export const metadata = policyMetadata("privacy");

export default function Page() {
  return <PolicyPage policy="privacy" />;
}
