import Link from "next/link";
import { AdminHeader, dateTime } from "@/components/admin/admin-ui";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requirePermission("customers:read");
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().slice(0, 80);
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  const stats = await db.order.groupBy({
    by: ["userId", "fulfillmentStatus"],
    where: { userId: { in: customers.map((c) => c.id) }, isTest: false },
    _count: true,
    _sum: { totalPaise: true },
  });
  const forUser = (id: string) => {
    const rows = stats.filter((s) => s.userId === id);
    const delivered = rows.find((r) => r.fulfillmentStatus === "DELIVERED");
    return { orders: rows.reduce((n, r) => n + r._count, 0), completed: delivered?._count ?? 0, spent: delivered?._sum.totalPaise ?? 0 };
  };
  return (
    <>
      <AdminHeader title="Customers" sub="Registered customers. Guest checkouts appear only on their orders. Personal details are visible to staff and never public." />
      <form method="get" className="mb-6 flex gap-3" role="search"><input name="q" defaultValue={q} placeholder="Search name or email" className="input max-w-sm" aria-label="Search customers" /><button className="btn btn-outline btn-sm" type="submit">Search</button></form>
      <div className="table-wrap border border-line bg-white">
        <table className="table">
          <thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Completed</th><th>Completed value</th></tr></thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-muted">No customers yet.</td></tr>}
            {customers.map((c) => { const s = forUser(c.id); return (
              <tr key={c.id}><td><Link href={`/admin/customers/${c.id}`} className="font-semibold text-forest underline">{c.name}</Link></td><td>{c.email}</td><td>{c.phone ?? "—"}</td><td>{dateTime(c.createdAt)}</td><td>{s.orders}</td><td>{s.completed}</td><td>{formatINR(s.spent)}</td></tr>
            ); })}
          </tbody>
        </table>
      </div>
    </>
  );
}
