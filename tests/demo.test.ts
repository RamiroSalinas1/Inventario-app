import { describe, expect, it } from "vitest";
import {
  demoCompanies,
  demoInventories,
  getDemoInventory,
} from "@/features/demo/data";
import { GET, POST } from "@/app/api/auth/[...all]/route";

describe("demo pública", () => {
  it("recalcula métricas por inventario sin combinar empresas", () => {
    const general = getDemoInventory("norte", "general");
    expect(general.products).toHaveLength(6);
    expect(general.units).toBe(452);
    expect(general.lowStock).toBe(3);
    expect(getDemoInventory("sur", "general").products).toHaveLength(0);
    for (const company of demoCompanies)
      for (const inventory of demoInventories.filter(
        (i) => i.companyId === company.id,
      )) {
        const data = getDemoInventory(company.id, inventory.id);
        expect(
          data.products.every(
            (p) => p.companyId === company.id && p.inventoryId === inventory.id,
          ),
        ).toBe(true);
        expect(
          data.movements.every((m) =>
            data.products.some((p) => p.id === m.productId),
          ),
        ).toBe(true);
      }
  });
  it("mantiene la autenticación cerrada y no devuelve usuarios ficticios", async () => {
    for (const handler of [GET, POST]) {
      const response = handler();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: "AUTH_NOT_ENABLED",
      });
    }
  });
});
