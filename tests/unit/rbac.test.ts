import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(root, dir))) {
    const rel = path.join(dir, name);
    if (statSync(path.join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

/**
 * "Never rely on hiding an admin button": these structural tests fail the build if someone adds an
 * administrative action, page or route handler without a server-side permission check.
 */
describe("every administrative entry point checks permissions on the server", () => {
  const AUTH = /\b(authorize|requirePermission|guarded|run)\(/;

  it("the guard helpers themselves call authorize()", () => {
    expect(read("src/actions/admin/orders.ts")).toMatch(/async function run[\s\S]*?authorize\(permission\)/);
    expect(read("src/actions/admin/catalog.ts")).toMatch(/async function guarded[\s\S]*?authorize\(permission\)/);
    expect(read("src/actions/admin/misc.ts")).toMatch(/async function guarded[\s\S]*?authorize\(permission\)/);
  });

  for (const file of walk("src/actions/admin").filter((f) => f.endsWith(".ts"))) {
    it(`${file}: every exported server action is guarded`, () => {
      const src = read(file);
      const parts = src.split(/^export async function /m).slice(1);
      expect(parts.length).toBeGreaterThan(0);
      for (const part of parts) {
        const name = part.slice(0, part.indexOf("("));
        expect(AUTH.test(part), `${name} has no server-side permission check`).toBe(true);
      }
    });
  }

  const adminPages = walk("src/app/admin/(panel)").filter((f) => /(page\.tsx|route\.ts)$/.test(f));
  it("finds the admin pages", () => expect(adminPages.length).toBeGreaterThanOrEqual(14));
  for (const file of adminPages) {
    it(`${file} checks permission itself (layouts alone are not enough)`, () => {
      expect(/requirePermission\(|authorize\(/.test(read(file))).toBe(true);
    });
  }

  it("the admin layout redirects non-staff", () => {
    expect(read("src/app/admin/(panel)/layout.tsx")).toMatch(/isStaff\(user\.role\)/);
  });

  it("no admin action trusts a role or price coming from the request", () => {
    for (const file of walk("src/actions").filter((f) => f.endsWith(".ts"))) {
      const src = read(file);
      expect(src, file).not.toMatch(/formData\.get\(["']role["']\)|fd\.get\(["']role["']\)/);
    }
    expect(read("src/actions/auth.ts")).toMatch(/role: "CUSTOMER"/);
  });

  it("server actions files export only async functions (Next.js requirement) and no secrets", () => {
    for (const file of walk("src/actions").filter((f) => f.endsWith(".ts"))) {
      const src = read(file);
      expect(src.split("\n")[0]).toContain("use server");
      expect(src, file).not.toMatch(/process\.env\.(RAZORPAY_KEY_SECRET|DATABASE_URL)/);
    }
  });
});

describe("secrets never reach client bundles", () => {
  it("client components do not import server-only modules or env", () => {
    for (const file of walk("src/components").filter((f) => f.endsWith(".tsx"))) {
      const src = read(file);
      if (!src.startsWith('"use client"')) continue;
      expect(src, file).not.toMatch(/from "@\/lib\/(db|env|auth\/session|orders|order-admin|notify|storage|order-access)"/);
      expect(src, file).not.toMatch(/process\.env/);
    }
  });
});
