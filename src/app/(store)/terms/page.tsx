import { PolicyPage, policyMetadata } from "@/components/store/policy-page";

export const metadata = policyMetadata("terms");

export default function Page() {
  return <PolicyPage policy="terms" />;
}
