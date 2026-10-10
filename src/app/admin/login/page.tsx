import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLoginAction } from "@/actions/auth";
import { ActionForm, TextField } from "@/components/ui/auth-form";
import { isStaff } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && isStaff(user.role)) redirect("/admin");
  return (
    <div className="on-dark grid min-h-screen place-items-center bg-forest px-4 py-16">
      <div className="w-full max-w-md bg-ivory p-8 sm:p-10">
        <Image src="/images/logo-192.png" alt="DGAP Brownie Delight" width={72} height={72} className="mx-auto rounded-[3px] ring-1 ring-gold" priority />
        <h1 className="mt-6 text-center text-4xl !text-forest">Admin sign in</h1>
        <span className="rule-gold mx-auto my-5" aria-hidden />
        <ActionForm action={adminLoginAction} submitLabel="Sign in" pendingLabel="Signing in…">
          <TextField label="Email" name="email" type="email" autoComplete="username" />
          <TextField label="Password" name="password" type="password" autoComplete="current-password" />
        </ActionForm>
        <p className="mt-6 text-center text-xs text-muted">Staff only. Repeated failed attempts lock the account for 15 minutes.</p>
        <p className="mt-3 text-center text-xs"><Link href="/" className="link-underline text-forest">Back to the shop</Link></p>
      </div>
    </div>
  );
}
