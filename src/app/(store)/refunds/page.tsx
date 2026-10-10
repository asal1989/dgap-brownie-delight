import { PolicyPage, policyMetadata } from "@/components/store/policy-page";

export const metadata = policyMetadata("refunds");

export default function Page() {
  return <PolicyPage policy="refunds" />;
}
