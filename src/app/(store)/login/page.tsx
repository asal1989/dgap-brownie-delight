import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/layout/auth-form";
import { PageHeader } from "@/components/layout/page-header";
import { readSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "";
  const session = await readSession();
  if (session) redirect(safeNext || (session.role === "ADMIN" ? "/admin" : "/account"));
  return (
    <>
      <PageHeader title="Welcome back" subtitle="Sign in to track orders, or create a free account." />
      <div className="container-page py-12 lg:py-16">
        <AuthForm next={safeNext} />
      </div>
    </>
  );
}
