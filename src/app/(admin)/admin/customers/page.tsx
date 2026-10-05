import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { AdminTitle, EmptyRow, TableWrap, td, th } from "@/components/admin/bits";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const customers = await prisma.customer.findMany({
    where: {
      role: "CUSTOMER",
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    },
    include: { orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <AdminTitle title="Customers" />
      <form className="mb-4" role="search"><input name="q" defaultValue={q} placeholder="Search name, email, phone…" aria-label="Search customers" className="h-11 w-full max-w-sm rounded-full border border-beige bg-white px-5 text-sm outline-none focus:border-caramel" /></form>
      <TableWrap>
        <thead><tr><th className={th}>Name</th><th className={th}>Contact</th><th className={th}>Account</th><th className={th}>Orders</th><th className={`${th} text-right`}>Spent</th><th className={th}>Joined</th></tr></thead>
        <tbody>
          {customers.length === 0 ? <EmptyRow cols={6} text="No customers yet." /> : null}
          {customers.map((c) => (
            <tr key={c.id}>
              <td className={`${td} font-semibold text-choc`}>{c.name}</td>
              <td className={td}>{c.phone ?? "-"}<br /><span className="text-xs text-ink/70">{c.email ?? ""}</span></td>
              <td className={td}>{c.passwordHash ? "Registered" : "Guest"}</td>
              <td className={td}>{c.orders.length}</td>
              <td className={`${td} text-right font-semibold`}>{formatINR(c.orders.reduce((n, o) => n + o.total, 0))}</td>
              <td className={`${td} whitespace-nowrap`}>{c.createdAt.toLocaleDateString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
