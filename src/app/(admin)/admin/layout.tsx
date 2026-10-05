import type { Metadata } from "next";
import { AdminFrame } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | DGAP Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const unread = await prisma.contactMessage.count({ where: { isRead: false } });
  return (
    <AdminFrame name={admin.name} unread={unread}>
      {children}
    </AdminFrame>
  );
}
