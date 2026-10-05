"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { adminInput } from "@/components/admin/fields";

/** Textarea of image paths/URLs (one per line) with a one-click uploader that appends to it. */
export function ImageField({ name, defaultValue, multiple = true, label }: { name: string; defaultValue: string; multiple?: boolean; label: string }) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setStatus(null);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
        urls.push(data.url);
      } catch (e) {
        setStatus((e as Error).message);
      }
    }
    if (urls.length) setValue((v) => (multiple ? [v.trim(), ...urls].filter(Boolean).join("\n") : urls[0]!));
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      {multiple ? (
        <textarea id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} rows={3} className={adminInput} placeholder="/images/products/example.webp or https://…" aria-label={label} />
      ) : (
        <input id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} className={adminInput} placeholder="/images/… or https://…" aria-label={label} />
      )}
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-page px-4 text-sm font-semibold text-heading hover:bg-panel2/60">
        <Upload className="size-4" aria-hidden /> {busy ? "Uploading…" : "Upload image"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
      {status ? <p className="text-sm text-danger" role="alert">{status}</p> : null}
    </div>
  );
}
