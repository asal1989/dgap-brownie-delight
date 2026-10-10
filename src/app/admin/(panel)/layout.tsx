import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { ToastProvider } from "@/components/ui/toast";
import { AdminNav, type NavItem } from "@/components/admin/admin-nav";
import { can, isStaff, type Permission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

const NAV: (NavItem & { permission: Permission })[] = [
  { href: "/admin", label: "Dashboard", permission: "orders:read" },
  { href: "/admin/orders", label: "Orders", permission: "orders:read" },
  { href: "/admin/products", label: "Products", permission: "products:read" },
  { href: "/admin/categories", label: "Categories", permission: "categories:write" },
  { href: "/admin/inventory", label: "Inventory", permission: "inventory:write" },
  { href: "/admin/customers", label: "Customers", permission: "customers:read" },
  { href: "/admin/coupons", label: "Coupons", permission: "coupons:write" },
  { href: "/admin/reviews", label: "Reviews", permission: "reviews:moderate" },
  { href: "/admin/analytics", label: "Analytics", permission: "analytics:read" },
  { href: "/admin/settings", label: "Settings", permission: "settings:write" },
  { href: "/admin/audit-logs", label: "Audit log", permission: "audit:read" },
];

/** Every page in this group is behind a server-side staff check, re-evaluated on each request. */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) redirect("/admin/login");
  const items = NAV.filter((n) => can(user.role, n.permission));

  return (
    <ToastProvider>
    <div className="lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="no-print border-b border-line bg-white px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:py-8">
        <Link href="/admin" className="mb-4 flex items-center gap-3 lg:mb-8">
          <Image src="/images/logo-192.png" alt="" width={44} height={44} className="rounded-[3px] ring-1 ring-gold/70" />
          <span className="font-serif text-xl leading-tight text-forest">DGAP<br /><span className="text-sm text-muted">Admin</span></span>
        </Link>
        <AdminNav items={items} />
        <div className="mt-6 hidden border-t border-line pt-5 text-xs text-muted lg:block">
          <p className="font-semibold text-espresso">{user.name}</p>
          <p className="mb-3 break-all">{user.email} · {user.role}</p>
          <div className="flex flex-col gap-2">
            <Link href="/" className="link-underline w-fit text-forest">View storefront</Link>
            <form action={logoutAction}><button type="submit" className="link-underline text-forest">Sign out</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:py-10">
        <div className="mb-4 flex items-center justify-end gap-4 text-xs text-muted lg:hidden">
          <span>{user.name} · {user.role}</span>
          <form action={logoutAction}><button type="submit" className="link-underline text-forest">Sign out</button></form>
        </div>
        {children}
      </div>
    </div>
    </ToastProvider>
  );
}
