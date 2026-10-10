import { AdminHeader, dateTime } from "@/components/admin/admin-ui";
import { Pagination } from "@/components/store/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Audit log" };
const PAGE = 50;

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  await requirePermission("audit:read");
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const action = one("action")?.trim().slice(0, 60);
  const page = Math.max(1, Math.min(1000, Number(one("page")) || 1));
  const where = action ? { action: { contains: action, mode: "insensitive" as const } } : {};
  const [total, logs] = await Promise.all([db.auditLog.count({ where }), db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE })]);
  return (
    <>
      <AdminHeader title="Audit log" sub="A permanent record of sensitive administrative actions: who did what, and when. Entries cannot be edited from the admin." />
      <form method="get" className="mb-6 flex gap-3" role="search"><input name="action" defaultValue={action} placeholder="Filter by action, e.g. order.refund" className="input max-w-sm" aria-label="Filter by action" /><button className="btn btn-outline btn-sm" type="submit">Filter</button></form>
      <div className="table-wrap border border-line bg-white">
        <table className="table" data-testid="audit-table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted">No entries.</td></tr>}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{dateTime(l.createdAt)}</td><td>{l.actorLabel}</td><td className="font-mono text-xs">{l.action}</td><td className="text-xs">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 10)}` : ""}</td>
                <td className="max-w-md break-words font-mono text-[0.7rem] text-muted">{l.metadata ? JSON.stringify(l.metadata) : ""}</td><td className="text-xs text-muted">{l.ip ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(n) => `/admin/audit-logs?${new URLSearchParams({ ...(action ? { action } : {}), page: String(n) })}`} />
    </>
  );
}
