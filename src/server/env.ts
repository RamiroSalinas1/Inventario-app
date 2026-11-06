import "server-only";
import { z } from "zod";
import { databaseUrlSchema } from "./db/connection-config";

const databaseEnv = z.object({
  DATABASE_URL: databaseUrlSchema,
});
const authEnv = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

// Lazy validation: the public demo and build never need secrets or a DB connection.
export function getDatabaseEnv() {
  return databaseEnv.parse(process.env);
}
export function getAuthEnv() {
  return authEnv.parse(process.env);
}
