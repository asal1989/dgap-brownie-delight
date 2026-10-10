/**
 * One-time admin provisioning.
 *
 *   SEED_ADMIN_EMAIL=owner@example.com SEED_ADMIN_PASSWORD='...' npm run admin:create
 *
 * Creates an ADMIN user (or promotes + resets the password of an existing one). There are no default
 * credentials anywhere in the codebase: the password must be supplied here and meet the admin policy.
 */
import "dotenv/config";
import { z } from "zod";
import { adminPasswordSchema, hashPassword } from "../src/lib/auth/password";
import { db } from "../src/lib/db";

async function main() {
  const email = z.string().email().parse(process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase());
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Administrator";
  const parsed = adminPasswordSchema.safeParse(process.env.SEED_ADMIN_PASSWORD);
  if (!parsed.success) {
    console.error("SEED_ADMIN_PASSWORD rejected:", parsed.error.issues.map((i) => i.message).join("; "));
    process.exitCode = 1;
    return;
  }
  const passwordHash = await hashPassword(parsed.data);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name, role: "ADMIN", passwordHash },
    update: { role: "ADMIN", passwordHash, isActive: true, failedLoginCount: 0, lockedUntil: null },
  });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.auditLog.create({ data: { actorLabel: "CLI", action: "admin.provision", entity: "User", entityId: user.id, metadata: { email } } });
  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
