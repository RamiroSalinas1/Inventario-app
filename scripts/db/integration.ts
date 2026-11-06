import assert from "node:assert/strict";
import type { PoolClient } from "pg";
import { developmentOnly, pool, run } from "./config.ts";
import { isolationScenario } from "./isolation.ts";
import { verifyRole } from "./verify.ts";

await run(async () => {
  developmentOnly();
  const app = pool("app"),
    migration = pool("migration");
  try {
    const admin = await migration.connect();
    try {
      await admin.query("BEGIN");
      const checks = await isolationScenario(admin);
      console.log(
        `${checks} comprobaciones de aislamiento/restricciones aprobadas (fixtures en ROLLBACK)`,
      );
    } finally {
      try {
        await admin.query("ROLLBACK");
      } finally {
        admin.release();
      }
    }
    const first = await app.connect();
    let second: PoolClient | undefined;
    try {
      second = await app.connect();
      await verifyRole(first);
      await verifyRole(second);
      const clean = async (client: typeof first) => {
        const result = await client.query(
          "SELECT nullif(current_setting('app.company_id',true),'') AS company, nullif(current_setting('app.inventory_id',true),'') AS inventory, nullif(current_setting('app.user_id',true),'') AS identity",
        );
        assert.deepEqual(result.rows, [
          { company: null, inventory: null, identity: null },
        ]);
        assert.equal(
          (await client.query("SELECT * FROM products LIMIT 1")).rowCount,
          0,
        );
      };
      await clean(first);
      await clean(second);
      for (const outcome of ["COMMIT", "ROLLBACK"]) {
        await first.query("BEGIN");
        await first.query(
          "SELECT set_config('app.company_id','00000000-0000-4000-8000-000000000001',true),set_config('app.inventory_id','00000000-0000-4000-8000-000000000011',true),set_config('app.user_id','pool-test',true)",
        );
        await clean(second);
        await first.query(outcome);
        await clean(first);
      }
      console.log(
        "Roles de login y limpieza de contexto en dos conexiones del pool: aprobados",
      );
    } finally {
      try {
        await first.query("ROLLBACK");
      } finally {
        first.release();
        second?.release();
      }
    }
    const reused = await app.connect();
    try {
      assert.equal(
        (await reused.query("SELECT * FROM products LIMIT 1")).rowCount,
        0,
      );
    } finally {
      reused.release();
    }
  } finally {
    await Promise.all([app.end(), migration.end()]);
  }
});
