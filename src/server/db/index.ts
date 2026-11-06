import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseEnv } from "@/server/env";
import * as schema from "./schema";
import { poolOptions } from "./connection-config";

function createDatabase() {
  const pool = new Pool(poolOptions(getDatabaseEnv().DATABASE_URL));
  if (process.env.VERCEL) attachDatabasePool(pool);
  return drizzle(pool, { schema });
}
let database: ReturnType<typeof createDatabase> | undefined;
export function getDb() {
  return (database ??= createDatabase());
}
export type Database = ReturnType<typeof getDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
