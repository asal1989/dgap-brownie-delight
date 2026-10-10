import type { Role } from "@/generated/prisma/enums";

export const PERMISSIONS = [
  "orders:read",
  "orders:update",
  "orders:cancel",
  "orders:refund",
  "orders:export",
  "products:read",
  "products:write",
  "categories:write",
  "inventory:write",
  "customers:read",
  "customers:notes",
  "coupons:write",
  "reviews:moderate",
  "analytics:read",
  "settings:write",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role matrix. STAFF run day-to-day operations; only ADMIN can refund, change prices/settings,
 * export customer data or read the audit trail. CUSTOMER has no administrative permissions.
 */
const MATRIX: Record<Role, readonly Permission[]> = {
  CUSTOMER: [],
  STAFF: ["orders:read", "orders:update", "products:read", "inventory:write", "customers:read", "reviews:moderate"],
  ADMIN: PERMISSIONS,
};

export const can = (role: Role | null | undefined, permission: Permission): boolean =>
  role != null && MATRIX[role].includes(permission);

export const isStaff = (role: Role | null | undefined): boolean => role === "STAFF" || role === "ADMIN";
