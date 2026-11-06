import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: { user: { id: "verified-user" } } as { user: { id: string } } | null,
  unsafeRole: false,
  rows: [] as unknown[][],
  transaction: vi.fn(),
  execute: vi.fn(),
  select: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/server/auth", () => ({
  getAuth: () => ({ api: { getSession: async () => state.session } }),
}));
vi.mock("@/server/db", () => ({
  getDb: () => ({ transaction: state.transaction }),
}));

import { withInventoryContext } from "@/server/tenancy/context";
const scope = {
  companyId: "00000000-0000-4000-8000-000000000001",
  inventoryId: "00000000-0000-4000-8000-000000000011",
};
const work = vi.fn(async () => "authorized-result");

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { user: { id: "verified-user" } };
  state.unsafeRole = false;
  state.rows = [
    [{ role: "viewer", active: true }],
    [{ id: scope.inventoryId }],
  ];
  state.execute.mockImplementation(async () => ({
    rows: [{ unsafe: state.unsafeRole }],
  }));
  state.select.mockImplementation(() => {
    const chain = {
      from: () => chain,
      where: () => chain,
      limit: async () => state.rows.shift() ?? [],
    };
    return chain;
  });
  state.transaction.mockImplementation(async (callback) =>
    callback({ execute: state.execute, select: state.select }),
  );
});

describe("guard del servidor con sesión y transacción controladas en test", () => {
  it("rechaza UUIDs inválidos antes de acceder a la base", async () => {
    await expect(
      withInventoryContext(
        { ...scope, inventoryId: "invalid" },
        "inventory:read",
        work,
      ),
    ).rejects.toThrow();
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("rechaza peticiones sin sesión sin abrir una transacción", async () => {
    state.session = null;
    await expect(
      withInventoryContext(scope, "inventory:read", work),
    ).rejects.toMatchObject({ status: 401 });
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("rechaza una conexión capaz de omitir RLS", async () => {
    state.unsafeRole = true;
    await expect(
      withInventoryContext(scope, "inventory:read", work),
    ).rejects.toThrow(/BYPASSRLS/);
    expect(state.select).not.toHaveBeenCalled();
    expect(work).not.toHaveBeenCalled();
  });
  it.each([[], [{ role: "company_admin", active: false }]])(
    "rechaza membresía ausente o inactiva: %j",
    async (...membership) => {
      state.rows = [membership.flat(), [{ id: scope.inventoryId }]];
      await expect(
        withInventoryContext(scope, "inventory:read", work),
      ).rejects.toMatchObject({ status: 403 });
      expect(work).not.toHaveBeenCalled();
    },
  );
  it("no permite escrituras a un usuario de consulta", async () => {
    await expect(
      withInventoryContext(scope, "inventory:write", work),
    ).rejects.toMatchObject({ status: 403 });
    expect(work).not.toHaveBeenCalled();
  });
  it("rechaza un inventario no perteneciente al contexto autorizado", async () => {
    state.rows[1] = [];
    await expect(
      withInventoryContext(scope, "inventory:read", work),
    ).rejects.toMatchObject({ status: 404 });
    expect(work).not.toHaveBeenCalled();
  });
  it("entrega sólo la transacción y el contexto validados al repositorio", async () => {
    await expect(
      withInventoryContext(scope, "inventory:read", work),
    ).resolves.toBe("authorized-result");
    expect(work).toHaveBeenCalledWith(
      expect.objectContaining({ execute: state.execute }),
      scope,
    );
    expect(state.execute).toHaveBeenCalledTimes(3);
  });
});
