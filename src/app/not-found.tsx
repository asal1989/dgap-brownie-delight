import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-ivory px-6 text-center">
      <div>
        <p className="eyebrow mb-4">Error 404</p>
        <h1 className="text-[clamp(3rem,8vw,5.5rem)]">This page has crumbled</h1>
        <span className="rule-gold mx-auto my-7" aria-hidden />
        <p className="mx-auto max-w-md text-muted">We could not find what you were looking for. It may have moved, or the link may be mistyped.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn btn-primary">Back to home</Link>
          <Link href="/shop" className="btn btn-outline">Shop brownies</Link>
        </div>
      </div>
    </main>
  );
}
