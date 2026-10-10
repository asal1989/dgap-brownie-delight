import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { requireUser } from "@/lib/auth/guards";
import { isStaff } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const orders = await db.order.count({ where: { userId: user.id } });
  return (
    <div className="container-narrow py-16">
      <p className="eyebrow mb-3">My account</p>
      <h1 className="text-5xl">Hello, {user.name.split(" ")[0]}</h1>
      <span className="rule-gold my-6" aria-hidden />
      <dl className="grid gap-6 sm:grid-cols-2">
        <div><dt className="eyebrow mb-1">Name</dt><dd>{user.name}</dd></div>
        <div><dt className="eyebrow mb-1">Email</dt><dd>{user.email}</dd></div>
      </dl>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/account/orders" className="btn btn-primary">My orders ({orders})</Link>
        {isStaff(user.role) && <Link href="/admin" className="btn btn-outline">Admin dashboard</Link>}
        <form action={logoutAction}><button type="submit" className="btn btn-outline">Sign out</button></form>
      </div>
    </div>
  );
}
