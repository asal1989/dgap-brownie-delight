import { PolicyPage, policyMetadata } from "@/components/store/policy-page";

export const metadata = policyMetadata("shipping");

export default function Page() {
  return <PolicyPage policy="shipping" />;
}
