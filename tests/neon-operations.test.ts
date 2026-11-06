import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { developmentOnly } from "../scripts/db/config";

const originalArguments = [...process.argv];
beforeEach(() => {
  process.argv = [...originalArguments, "--confirm-development"];
  vi.stubEnv("DB_ENV", "development");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("DB_DEV_HOST", "ep-dev.example.invalid");
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://inventory_app@ep-dev-pooler.example.invalid/inventory?sslmode=verify-full",
  );
  vi.stubEnv(
    "DATABASE_URL_UNPOOLED",
    "postgresql://migrator@ep-dev.example.invalid/inventory?sslmode=verify-full",
  );
});
afterEach(() => {
  process.argv = originalArguments;
  vi.unstubAllEnvs();
});
it("acepta sólo un destino de desarrollo confirmado y roles separados", () => {
  expect(() => developmentOnly()).not.toThrow();
});
it("rechaza operaciones sin confirmación explícita", () => {
  process.argv = originalArguments;
  expect(() => developmentOnly()).toThrow(/confirm-development/);
});
it("rechaza Vercel Production incluso con confirmación", () => {
  vi.stubEnv("VERCEL_ENV", "production");
  expect(() => developmentOnly()).toThrow(/Production/);
});
it.each([
  ["DB_ENV", "production"],
  ["DB_DEV_HOST", "ep-other.example.invalid"],
  [
    "DATABASE_URL_UNPOOLED",
    "postgresql://migrator@ep-other.example.invalid/inventory?sslmode=verify-full",
  ],
  [
    "DATABASE_URL_UNPOOLED",
    "postgresql://inventory_app@ep-dev.example.invalid/inventory?sslmode=verify-full",
  ],
  [
    "DATABASE_URL_UNPOOLED",
    "postgresql://migrator@ep-dev-pooler.example.invalid/inventory?sslmode=verify-full",
  ],
  [
    "DATABASE_URL_UNPOOLED",
    "postgresql://migrator@ep-dev.example.invalid/other?sslmode=verify-full",
  ],
])("rechaza una configuración incoherente: %s", (name, value) => {
  vi.stubEnv(name, value);
  expect(() => developmentOnly()).toThrow();
});
