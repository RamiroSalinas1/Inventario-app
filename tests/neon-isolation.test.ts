import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { isolationScenario } from "../scripts/db/isolation";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { verifyRole } from "../scripts/db/verify";

it("ejercita aprovisionamiento idempotente, mínimos privilegios y el escenario de integración en PGlite", async () => {
  const db = new PGlite();
  try {
    await migrate(drizzle(db), { migrationsFolder: "./drizzle" });
    await migrate(drizzle(db), { migrationsFolder: "./drizzle" });
    await db.exec("CREATE ROLE inventory_app LOGIN NOSUPERUSER NOBYPASSRLS");
    const sql = readFileSync("scripts/db/roles.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    await db.exec("BEGIN");
    expect(await isolationScenario(db)).toBeGreaterThanOrEqual(15);
    await db.exec("ROLLBACK");
    await db.exec("SET ROLE inventory_app");
    // verifyRole only needs the shared query interface; no socket APIs.
    await verifyRole(db);
    expect((await db.query("SELECT * FROM products")).rows).toHaveLength(0);
    await db.exec(
      "RESET ROLE; CREATE ROLE forbidden_parent; GRANT forbidden_parent TO inventory_app",
    );
    await expect(db.exec(sql)).rejects.toThrow(/membresías/i);
    await db.exec("SET ROLE inventory_app");
    await expect(verifyRole(db)).rejects.toThrow(/inseguro/i);
    await db.exec(
      "RESET ROLE; REVOKE forbidden_parent FROM inventory_app; GRANT CREATE ON SCHEMA public TO inventory_app; SET ROLE inventory_app",
    );
    await expect(verifyRole(db)).rejects.toThrow(/inseguro/i);
    await db.exec("RESET ROLE");
    await db.exec(sql);
    await db.exec("SET ROLE inventory_app");
    await verifyRole(db);
  } finally {
    await db.close();
  }
}, 30000);

it("aprovisiona como propietario de migraciones sin SUPERUSER ni CREATEROLE", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE inventory_migrator LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE;
      CREATE ROLE inventory_app LOGIN NOSUPERUSER NOBYPASSRLS;
      GRANT inventory_app TO inventory_migrator;
      ALTER SCHEMA public OWNER TO inventory_migrator;
    `);
    const name = (
      await db.query<{ name: string }>("SELECT current_database() AS name")
    ).rows[0].name;
    await db.exec(
      `GRANT CREATE ON DATABASE "${name.replaceAll('"', '""')}" TO inventory_migrator; SET ROLE inventory_migrator`,
    );
    await migrate(drizzle(db), { migrationsFolder: "./drizzle" });
    const sql = readFileSync("scripts/db/roles.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    await db.exec("BEGIN");
    expect(await isolationScenario(db)).toBeGreaterThanOrEqual(15);
    await db.exec("ROLLBACK; SET ROLE inventory_app");
    await verifyRole(db);
  } finally {
    await db.close();
  }
}, 30000);
