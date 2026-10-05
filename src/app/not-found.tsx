import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-page px-6 text-center">
      <div className="max-w-lg">
        <p className="font-display text-8xl font-bold text-caramel" aria-hidden>404</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold text-heading sm:text-5xl">Oops… This Brownie Crumbled.</h1>
        <p className="mt-4 text-lg text-fg/70">Let&apos;s get you back to something delicious.</p>
        <ButtonLink href="/shop" size="lg" className="mt-8">Back to brownies</ButtonLink>
        <p className="mt-6"><Link href="/" className="text-sm font-semibold text-caramel underline">Go to homepage</Link></p>
      </div>
    </main>
  );
}
