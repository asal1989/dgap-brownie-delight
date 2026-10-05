import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/actions/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title={`Hello, ${user.name}`} crumbs={[{ label: "Home", href: "/" }, { label: "Account" }]} />
      <div className="container-page max-w-2xl space-y-4 py-12">
        <div className="rounded-lg border border-line bg-panel p-6">
          <p className="text-sm text-fg/70">Signed in as</p>
          <p className="font-semibold text-heading">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/account/orders">My orders</ButtonLink>
          {user.role === "ADMIN" ? <ButtonLink href="/admin" variant="caramel">Admin dashboard</ButtonLink> : null}
          <ButtonLink href="/shop" variant="outline">Keep shopping</ButtonLink>
          <form action={logoutAction}><Button type="submit" variant="ghost">Sign out</Button></form>
        </div>
        <Link href="/faq" className="inline-block text-sm text-caramel underline">Need help? Read the FAQ</Link>
      </div>
    </>
  );
}
