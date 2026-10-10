import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/actions/auth";
import { ActionForm, TextField } from "@/components/ui/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/account/register">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next, "/account");
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="card-line w-full max-w-md p-8 sm:p-10">
        <h1 className="text-center text-5xl">Create your account</h1>
        <span className="rule-gold mx-auto my-6" aria-hidden />
        <ActionForm action={registerAction} submitLabel="Create account" pendingLabel="Creating…" hidden={{ next }}>
          <TextField label="Full name" name="name" autoComplete="name" />
          <TextField label="Email" name="email" type="email" autoComplete="email" />
          <TextField label="Password" name="password" type="password" autoComplete="new-password" minLength={10} hint="At least 10 characters, with letters and numbers." />
        </ActionForm>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="link-underline text-forest">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
