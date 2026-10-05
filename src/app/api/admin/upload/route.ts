import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const MAX_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from magic bytes; never trusts the client-supplied name or MIME. */
function sniff(buf: Buffer): "jpg" | "png" | "webp" | "avif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  if (buf.subarray(4, 8).toString() === "ftyp" && buf.subarray(8, 12).toString().startsWith("avif")) return "avif";
  return null;
}

/**
 * Stores uploads on local disk under /public/uploads.
 * NOTE: serverless hosts (e.g. Vercel) have a read-only filesystem. For those, swap this for object storage
 * (Vercel Blob, S3, Cloudinary) or paste hosted image URLs in the admin product form.
 */
export async function POST(req: Request) {
  const session = await readSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await prisma.customer.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return NextResponse.json({ error: "Only JPG, PNG, WebP or AVIF images are allowed" }, { status: 415 });

  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(path.join(dir, name), buf);
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch {
    return NextResponse.json({ error: "Server storage is read-only. Paste a hosted image URL instead." }, { status: 500 });
  }
}
