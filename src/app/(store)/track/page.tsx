import type { Metadata } from "next";
import Link from "next/link";
import { trackOrderAction } from "@/actions/checkout";
import { ActionForm, TextField } from "@/components/ui/auth-form";

export const metadata: Metadata = { title: "Track an order", robots: { index: false } };

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const sp = await searchParams;
  const order = (Array.isArray(sp.order) ? sp.order[0] : sp.order) ?? "";
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="card-line w-full max-w-md p-8 sm:p-10">
        <h1 className="text-center text-5xl">Track your order</h1>
        <span className="rule-gold mx-auto my-6" aria-hidden />
        <p className="mb-6 text-center text-sm text-muted">Enter your order number and the phone number you used at checkout.</p>
        <ActionForm action={trackOrderAction} submitLabel="Track order" pendingLabel="Looking…">
          <TextField label="Order number" name="orderNumber" defaultValue={order} hint="For example DGAP-1001" />
          <TextField label="Phone number" name="phone" type="tel" autoComplete="tel" />
        </ActionForm>
        <p className="mt-6 text-center text-sm text-muted">Have an account? <Link href="/account/login" className="link-underline text-forest">Sign in</Link></p>
      </div>
    </div>
  );
}
