import type { Prisma } from "@/generated/prisma/client";
import { db, type DbClient } from "./db";

export type Actor = { id: string | null; label: string };

export const SYSTEM_ACTOR: Actor = { id: null, label: "System" };
export const actorFromUser = (u: { id: string; name: string; email: string }): Actor => ({
  id: u.id,
  label: `${u.name} <${u.email}>`,
});

/** Record a sensitive administrative action. Accepts a transaction client so it commits with the change. */
export async function audit(
  actor: Actor,
  action: string,
  entity: string,
  entityId: string | null,
  metadata?: Prisma.InputJsonValue,
  client: DbClient = db,
  ip?: string,
) {
  await client.auditLog.create({
    data: { actorId: actor.id, actorLabel: actor.label, action, entity, entityId, metadata, ip: ip?.slice(0, 64) },
  });
}
