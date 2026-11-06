import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Generation works offline. No migrate/push command is exposed in package.json.
  ...(process.env.DATABASE_URL_UNPOOLED
    ? { dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED } }
    : {}),
  strict: true,
  verbose: true,
});
