import { describe, expect, it } from "vitest";
import {
  assertPermission,
  inventoryScopeSchema,
  type CompanyRole,
  type Permission,
} from "@/server/tenancy/permissions";

describe("permisos de empresa", () => {
  it.each<[CompanyRole, Permission]>([
    ["company_admin", "company:manage"],
    ["operator", "inventory:write"],
    ["viewer", "inventory:read"],
  ])("permite %s / %s", (role, permission) => {
    expect(() =>
      assertPermission({ role, active: true }, permission),
    ).not.toThrow();
  });
  it.each<[CompanyRole, Permission]>([
    ["operator", "company:manage"],
    ["viewer", "inventory:write"],
    ["viewer", "company:manage"],
  ])("rechaza %s / %s", (role, permission) => {
    expect(() =>
      assertPermission({ role, active: true }, permission),
    ).toThrow();
  });
  it("rechaza membresías ausentes o desactivadas incluso para administradores", () => {
    expect(() => assertPermission(undefined, "inventory:read")).toThrow();
    expect(() =>
      assertPermission(
        { role: "company_admin", active: false },
        "inventory:read",
      ),
    ).toThrow();
  });
  it("rechaza IDs inválidos y roles o identidades suministrados por el cliente", () => {
    expect(
      inventoryScopeSchema.safeParse({ companyId: "demo", inventoryId: "demo" })
        .success,
    ).toBe(false);
    expect(
      inventoryScopeSchema.safeParse({
        companyId: crypto.randomUUID(),
        inventoryId: crypto.randomUUID(),
        role: "company_admin",
      }).success,
    ).toBe(false);
  });
});
