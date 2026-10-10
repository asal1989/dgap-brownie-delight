import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { env } from "./env";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Kind = { ext: "jpg" | "png" | "webp"; mime: string };

/** Identify an image by its magic bytes. The browser-supplied MIME type and file name are never trusted. */
export function sniffImage(buf: Uint8Array): Kind | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export class UploadError extends Error {}

/**
 * Store an uploaded product image and return its public URL.
 *  - With BLOB_READ_WRITE_TOKEN: Vercel Blob (durable, CDN-backed). Use this in production.
 *  - Without it: public/uploads on local disk, development only (not durable on serverless hosts).
 */
export async function storeProductImage(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("The image is larger than 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new UploadError("Only JPEG, PNG or WebP images are allowed.");
  const name = `products/${randomUUID()}.${kind.ext}`;

  const e = env();
  if (e.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, Buffer.from(bytes), { access: "public", contentType: kind.mime, token: e.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false });
    return blob.url;
  }
  if (e.NODE_ENV === "production") throw new UploadError("Image storage is not configured (set BLOB_READ_WRITE_TOKEN).");
  const dir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, path.basename(name)), bytes);
  return `/uploads/${name}`;
}
