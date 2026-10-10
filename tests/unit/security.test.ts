import { describe, expect, it } from "vitest";
import { csvCell, csvRow, buildOrderOrderBy, buildOrderWhere, parseOrderFilters } from "@/lib/order-list";
import { sniffImage } from "@/lib/storage";
import { safeNext } from "@/lib/safe-next";
import { adminPasswordSchema, passwordSchema } from "@/lib/auth/password";
import { PERIODS, resolvePeriod, startOfDayIST } from "@/lib/analytics";
import { jsonLdString } from "@/lib/seo";
import { policyText } from "@/lib/policies";
import { defaultSettings } from "@/lib/settings";

describe("CSV export is safe from formula injection", () => {
  it("prefixes dangerous leading characters", () => {
    for (const bad of ["=1+1", "+cmd|' /C calc'!A0", "-2+3", "@SUM(1)", "\tcmd"]) expect(csvCell(bad).replace(/^"/, "")).toMatch(/^'/);
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("x\ny")).toBe('"x\ny"');
    expect(csvCell(null)).toBe("");
    expect(csvRow(["a", 1, "b,c"])).toBe('a,1,"b,c"');
  });
});

describe("image uploads are identified by content, not by name", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(20).fill(0)]);
  it("accepts JPEG, PNG and WebP signatures", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe("png");
    const webp = new Uint8Array(20);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImage(webp)?.ext).toBe("webp");
  });
  it("rejects scripts, SVG and executables pretending to be images", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<?php echo 1; ?>"))).toBeNull();
    expect(sniffImage(bytes(0x4d, 0x5a))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
  });
});

describe("redirect targets", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/checkout", "/")).toBe("/checkout");
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", undefined, 42]) expect(safeNext(bad, "/fallback")).toBe("/fallback");
  });
});

describe("password policy", () => {
  it("enforces strength", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletterslong").success).toBe(false);
    expect(passwordSchema.safeParse("goodpassw0rd").success).toBe(true);
    expect(adminPasswordSchema.safeParse("goodpassw0rd").success).toBe(false); // no upper-case
    expect(adminPasswordSchema.safeParse("Str0ngAdminPass!").success).toBe(true);
  });
});

describe("order list filters", () => {
  it("parses untrusted params and drops garbage", () => {
    const f = parseOrderFilters({ q: " DGAP-1001 ", status: "HACK", payment: "PAID", from: "2026-13-99x", sort: "total-desc", page: "0" });
    expect(f.q).toBe("DGAP-1001");
    expect(f.status).toBeUndefined(); // invalid value dropped
    expect(f.from).toBeUndefined();
    expect(f.payment).toBe("PAID"); // valid ones are kept
    expect(f.sort).toBe("total-desc");
    expect(f.page).toBe(1); // "0" is invalid, so the default applies
  });
  it("builds where/orderBy and hides test orders by default", () => {
    const f = parseOrderFilters({ q: "asha", status: "PREPARING", payment: "PAID", from: "2026-10-01", to: "2026-10-02", sort: "total-desc" });
    const w = buildOrderWhere(f);
    expect(w.fulfillmentStatus).toBe("PREPARING");
    expect(w.paymentStatus).toBe("PAID");
    expect(w.isTest).toBe(false);
    expect((w.placedAt as { gte: Date; lte: Date }).gte.toISOString()).toBe("2026-09-30T18:30:00.000Z"); // midnight IST
    expect(buildOrderOrderBy("total-desc")[0]).toEqual({ totalPaise: "desc" });
    expect(buildOrderWhere({ ...f, test: "1" }).isTest).toBeUndefined();
  });
});

describe("reporting periods (IST)", () => {
  it("starts the day at IST midnight", () => {
    expect(startOfDayIST(new Date("2026-10-10T20:00:00Z")).toISOString()).toBe("2026-10-10T18:30:00.000Z");
    expect(startOfDayIST(new Date("2026-10-10T10:00:00Z")).toISOString()).toBe("2026-10-09T18:30:00.000Z");
  });
  it("resolves every period and falls back safely", () => {
    const now = new Date("2026-10-10T10:00:00Z");
    expect(resolvePeriod("today", now).from?.toISOString()).toBe("2026-10-09T18:30:00.000Z");
    expect(resolvePeriod("7d", now).from?.toISOString()).toBe("2026-10-03T18:30:00.000Z");
    expect(resolvePeriod("month", now).from?.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(resolvePeriod("all", now).from).toBeNull();
    expect(resolvePeriod("garbage", now).key).toBe("30d");
    for (const p of PERIODS) expect(resolvePeriod(p, now).label.length).toBeGreaterThan(0);
  });
});

describe("structured data and policies", () => {
  it("escapes < in JSON-LD", () => {
    expect(jsonLdString({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
  it("default policies make no unverifiable promises", () => {
    const s = defaultSettings();
    for (const k of ["shipping", "refunds", "privacy", "terms"] as const) {
      const t = policyText(k, s);
      expect(t.length).toBeGreaterThan(80);
      expect(t).not.toMatch(/within \d+ (days|hours)|guarantee|free shipping|100%/i);
    }
  });
  it("uses an admin-written policy verbatim", () => {
    const s = defaultSettings();
    s.policies.refunds = "Custom refund text.";
    expect(policyText("refunds", s)).toBe("Custom refund text.");
  });
});
