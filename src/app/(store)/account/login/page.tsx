import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { ActionForm, TextField } from "@/components/ui/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next, "/account");
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="card-line w-full max-w-md p-8 sm:p-10">
        <h1 className="text-center text-5xl">Welcome back</h1>
        <span className="rule-gold mx-auto my-6" aria-hidden />
        <ActionForm action={loginAction} submitLabel="Sign in" pendingLabel="Signing in…" hidden={{ next }}>
          <TextField label="Email" name="email" type="email" autoComplete="email" />
          <TextField label="Password" name="password" type="password" autoComplete="current-password" />
        </ActionForm>
        <p className="mt-6 text-center text-sm text-muted">
          New here? <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="link-underline text-forest">Create an account</Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted">
          Placed an order as a guest? <Link href="/track" className="link-underline text-forest">Track it here</Link>
        </p>
      </div>
    </div>
  );
}
