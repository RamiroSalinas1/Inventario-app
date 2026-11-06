import { config } from "dotenv";
import { Pool } from "pg";
import { poolOptions } from "../../src/server/db/connection-config.ts";

config({ path: ".env.local", quiet: true });
class ConfigurationError extends Error {}
export function connection(kind: "app" | "migration") {
  const name = kind === "app" ? "DATABASE_URL" : "DATABASE_URL_UNPOOLED";
  const value = process.env[name];
  if (!value) throw new ConfigurationError(`Falta ${name}`);
  // Do not expose Zod issues or pg errors: they may contain connection values.
  try {
    return poolOptions(value);
  } catch {
    throw new ConfigurationError(
      `${name}: URL PostgreSQL inválida; requiere sslmode=verify-full`,
    );
  }
}
export function developmentOnly() {
  if (
    process.env.DB_ENV !== "development" ||
    process.env.VERCEL_ENV === "production" ||
    !process.argv.includes("--confirm-development")
  ) {
    throw new ConfigurationError(
      "Requiere DB_ENV=development y --confirm-development; prohibido en Vercel Production",
    );
  }
  const app = new URL(connection("app").connectionString);
  const migration = new URL(connection("migration").connectionString);
  const directHost = app.hostname.replace(/-pooler(?=\.)/, "");
  if (
    !process.env.DB_DEV_HOST ||
    migration.hostname !== process.env.DB_DEV_HOST ||
    migration.hostname.includes("-pooler.") ||
    directHost !== migration.hostname ||
    app.pathname !== migration.pathname ||
    app.port !== migration.port ||
    decodeURIComponent(app.username) ===
      decodeURIComponent(migration.username) ||
    decodeURIComponent(app.username) !== "inventory_app"
  ) {
    throw new ConfigurationError(
      "Confirmar DB_DEV_HOST directo, misma base/rama y roles distintos (app: inventory_app)",
    );
  }
}
export function pool(kind: "app" | "migration") {
  return new Pool(connection(kind));
}
export async function run(work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    const code = (error as { code?: string }).code;
    // Only our known messages are safe; external drivers can include SQL/data/URLs.
    console.error(
      "Operación de base de datos fallida. Revisar configuración y permisos; no se muestran detalles privados.",
      code && /^[A-Z0-9]{5}$/.test(code) ? `SQLSTATE ${code}` : "",
    );
    process.exitCode = 1;
  }
}
