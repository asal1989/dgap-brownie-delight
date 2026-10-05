import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/layout/page-header";
import { getSettings } from "@/lib/config";
import { currentUser } from "@/lib/auth/session";
import { listAvailableProviders } from "@/lib/payments/providers";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage() {
  const [s, user] = await Promise.all([getSettings(), currentUser()]);
  const full = user ? await prisma.customer.findUnique({ where: { id: user.id }, select: { email: true } }) : null;
  return (
    <>
      <PageHeader title="Checkout" crumbs={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <div className="container-page py-10 lg:py-14">
        <CheckoutForm
          methods={listAvailableProviders({ codEnabled: s.codEnabledBool })}
          prefill={{ name: user?.name ?? "", email: full?.email ?? "" }}
          deliveryAreas={s.deliveryAreas}
          sameDay={s.sameDayDeliveryBool}
          expectedDelivery={s.expectedDelivery}
          brandName={s.brandName}
        />
      </div>
    </>
  );
}
