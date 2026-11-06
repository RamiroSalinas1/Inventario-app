import { z } from "zod";

// Shared by server and operational commands; no environment access on import.
export const databaseUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      !!url.hostname &&
      !!url.username &&
      url.pathname.length > 1 &&
      url.searchParams.get("sslmode") === "verify-full" &&
      [...url.searchParams.keys()].every(
        (key) =>
          ["sslmode", "channel_binding", "application_name"].includes(key) &&
          url.searchParams.getAll(key).length === 1,
      )
    );
  } catch {
    return false;
  }
}, "Se requiere una URL PostgreSQL con sslmode=verify-full y sin parámetros duplicados ni overrides de conexión");

export function poolOptions(connectionString: string) {
  return {
    connectionString: databaseUrlSchema.parse(connectionString),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}
