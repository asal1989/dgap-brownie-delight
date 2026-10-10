import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="eyebrow mb-4">Error 403</p>
        <h1 className="text-5xl">You don’t have access to this page</h1>
        <span className="rule-gold mx-auto my-6" aria-hidden />
        <p className="mx-auto max-w-md text-muted">Your role does not include this area. If you think that is a mistake, ask an administrator.</p>
        <p className="mt-8"><Link href="/admin" className="btn btn-primary">Back to dashboard</Link></p>
      </div>
    </div>
  );
}
