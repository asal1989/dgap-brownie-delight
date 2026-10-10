import { db } from "./db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Fixed-window rate limiter backed by PostgreSQL, so the limit holds across every serverless instance.
 * `key` should combine the action and the caller, e.g. `login:${ip}:${email}`.
 */
export async function rateLimit(key: string, opts: { limit: number; windowSec: number }): Promise<RateLimitResult> {
  const windowMs = opts.windowSec * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);

  // Opportunistic cleanup so the table does not grow without bound.
  if (Math.random() < 0.01) {
    void db.rateLimitBucket
      .deleteMany({ where: { windowStart: { lt: new Date(now - 24 * 3600 * 1000) } } })
      .catch(() => undefined);
  }

  const retryAfterSec = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000));
  return { ok: count <= opts.limit, remaining: Math.max(0, opts.limit - count), retryAfterSec };
}

export const LIMITS = {
  login: { limit: 8, windowSec: 15 * 60 },
  register: { limit: 5, windowSec: 60 * 60 },
  checkout: { limit: 12, windowSec: 10 * 60 },
  coupon: { limit: 20, windowSec: 10 * 60 },
  newsletter: { limit: 5, windowSec: 60 * 60 },
  review: { limit: 5, windowSec: 60 * 60 },
  track: { limit: 15, windowSec: 10 * 60 },
  upload: { limit: 30, windowSec: 10 * 60 },
} as const;
