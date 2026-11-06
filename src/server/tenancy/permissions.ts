import { z } from "zod";

export const inventoryScopeSchema = z
  .object({ companyId: z.uuid(), inventoryId: z.uuid() })
  .strict();
export type InventoryScope = z.infer<typeof inventoryScopeSchema>;
export type CompanyRole = "company_admin" | "operator" | "viewer";
export type Permission =
  "inventory:read" | "inventory:write" | "company:manage";
const permissions: Record<CompanyRole, readonly Permission[]> = {
  company_admin: ["inventory:read", "inventory:write", "company:manage"],
  operator: ["inventory:read", "inventory:write"],
  viewer: ["inventory:read"],
};
export class AccessDenied extends Error {
  constructor(public readonly status: 401 | 403 | 404) {
    super("Acceso no autorizado");
  }
}
export function assertPermission(
  membership: { role: CompanyRole; active: boolean } | undefined,
  permission: Permission,
) {
  if (
    !membership?.active ||
    !permissions[membership.role]?.includes(permission)
  )
    throw new AccessDenied(403);
}
