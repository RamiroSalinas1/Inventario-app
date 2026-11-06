import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { developmentOnly, pool, run } from "./config.ts";
import { verifyRole } from "./verify.ts";

await run(async () => {
  const command = process.argv[2];
  if (!["check", "migrate", "roles"].includes(command))
    throw new Error("Comando desconocido");
  if (command !== "check") developmentOnly();
  const db = pool(command === "check" ? "app" : "migration");
  try {
    if (command === "migrate") {
      // Drizzle journal tracks applied migrations. Never run in build/install/CI.
      await migrate(drizzle(db), { migrationsFolder: "./drizzle" });
    } else {
      const client = await db.connect();
      try {
        if (command === "check") {
          await client.query("BEGIN READ ONLY");
          await verifyRole(client);
          const result = await client.query("SELECT * FROM products LIMIT 1");
          if (result.rowCount !== 0)
            throw new Error("Sin contexto no deben verse productos");
          await client.query("ROLLBACK");
        } else {
          await client.query("BEGIN");
          await client.query(await readFile("scripts/db/roles.sql", "utf8"));
          await client.query("COMMIT");
        }
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    console.log(`db:${command}: verificado`);
  } finally {
    await db.end();
  }
});
