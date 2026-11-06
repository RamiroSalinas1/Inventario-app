import { describe, expect, it } from "vitest";
import { databaseUrlSchema, poolOptions } from "@/server/db/connection-config";

describe("conexión PostgreSQL verificada", () => {
  const valid =
    "postgresql://inventory_app@example.invalid/inventory?sslmode=verify-full";
  it("conserva TLS verificado y un pool acotado", () => {
    expect(poolOptions(valid)).toMatchObject({
      max: 5,
      connectionTimeoutMillis: 10000,
      connectionString: valid,
    });
  });
  it.each([
    valid.replace("verify-full", "require"),
    valid.replace("verify-full", "disable"),
    valid.split("?")[0],
    valid.replace("postgresql:", "https:"),
    `${valid}&sslrootcert=untrusted`,
    `${valid}&uselibpqcompat=true`,
    `${valid}&sslmode=disable`,
    `${valid}&host=other.example.invalid`,
    `${valid}&user=owner`,
    `${valid}&options=-crole=owner`,
  ])("rechaza TLS alternativo o configuración insegura", (url) => {
    expect(databaseUrlSchema.safeParse(url).success).toBe(false);
  });
});
