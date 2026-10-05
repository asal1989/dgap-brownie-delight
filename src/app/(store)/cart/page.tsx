import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

export default function CartPage() {
  return (
    <>
      <PageHeader title="Your cart" crumbs={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <div className="container-page py-10 lg:py-14">
        <CartView />
      </div>
    </>
  );
}
