import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export interface Queryable {
  query(
    sql: string,
    parameters?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}
// Caller owns BEGIN/ROLLBACK: all fixtures, even immutable history, are discarded.
export async function isolationScenario(db: Queryable) {
  let checks = 0;
  const expectFailure = async (
    sql: string,
    params: unknown[],
    code: string,
  ) => {
    await db.query("SAVEPOINT negative_case");
    let caught: unknown;
    try {
      await db.query(sql, params);
    } catch (error) {
      caught = error;
    }
    await db.query("ROLLBACK TO SAVEPOINT negative_case");
    await db.query("RELEASE SAVEPOINT negative_case");
    assert.equal((caught as { code?: string } | undefined)?.code, code);
    checks++;
  };
  const [a, b, tools, parts, materials, category, pa, pp, pb, wh, loc] =
    Array.from({ length: 11 }, () => randomUUID());
  const user = randomUUID(),
    inactive = randomUUID();
  await db.query(
    "INSERT INTO users(id,name,email) VALUES ($1,'Ficticio',$2),($3,'Inactivo',$4)",
    [user, `${user}@example.invalid`, inactive, `${inactive}@example.invalid`],
  );
  await db.query(
    "INSERT INTO companies(id,name,slug) VALUES ($1,'Empresa A',$3),($2,'Empresa B',$4)",
    [a, b, `a-${a}`, `b-${b}`],
  );
  await db.query(
    "INSERT INTO memberships(company_id,user_id,role,active) VALUES ($1,$2,'viewer',true),($1,$3,'viewer',false)",
    [a, user, inactive],
  );
  await db.query(
    "INSERT INTO inventories(id,company_id,name) VALUES ($1,$4,'Herramientas'),($2,$4,'Repuestos'),($3,$5,'Materiales')",
    [tools, parts, materials, a, b],
  );
  await db.query(
    "INSERT INTO categories(id,company_id,inventory_id,name) VALUES ($1,$2,$3,'Ficticia')",
    [category, a, tools],
  );
  await db.query(
    "INSERT INTO products(id,company_id,inventory_id,sku,name) VALUES ($1,$4,$6,'A','Herramienta'),($2,$4,$7,'A','Repuesto'),($3,$5,$8,'A','Material')",
    [pa, pp, pb, a, b, tools, parts, materials],
  );
  await db.query(
    "INSERT INTO warehouses(id,company_id,inventory_id,name) VALUES ($1,$2,$3,'Ficticio')",
    [wh, a, tools],
  );
  await db.query(
    "INSERT INTO warehouse_locations(id,company_id,inventory_id,warehouse_id,name) VALUES ($1,$2,$3,$4,'General')",
    [loc, a, tools, wh],
  );
  await db.query(
    "INSERT INTO stock_movements(company_id,inventory_id,product_id,warehouse_id,location_id,type,quantity_delta,actor_user_id,reason,idempotency_key) VALUES ($1,$2,$3,$4,$5,'in',1,$6,'Prueba',$7)",
    [a, tools, pa, wh, loc, user, randomUUID()],
  );
  await db.query(
    "INSERT INTO audit_logs(company_id,inventory_id,action,entity_type,entity_id) VALUES ($1,$2,'test','product',$3)",
    [a, tools, pa],
  );
  // FK checks as owner distinguish referential constraints from RLS/ACL denials.
  for (const [company, inventory] of [
    [a, parts],
    [b, materials],
  ]) {
    await expectFailure(
      "INSERT INTO products(company_id,inventory_id,sku,name,category_id) VALUES ($1,$2,'BAD','bad',$3)",
      [company, inventory, category],
      "23503",
    );
  }
  await expectFailure(
    "INSERT INTO stock_movements(company_id,inventory_id,product_id,warehouse_id,location_id,type,quantity_delta,actor_user_id,reason,idempotency_key) VALUES ($1,$2,$3,$4,$5,'in',1,$6,'bad',$7)",
    [a, tools, pp, wh, loc, user, randomUUID()],
    "23503",
  );
  await expectFailure(
    "UPDATE stock_movements SET reason='bad' WHERE product_id=$1",
    [pa],
    "P0001",
  );
  await expectFailure(
    "DELETE FROM audit_logs WHERE entity_id=$1",
    [pa],
    "P0001",
  );
  await db.query("SET LOCAL ROLE inventory_app");
  assert.equal((await db.query("SELECT * FROM products")).rows.length, 0);
  checks++;
  const context = async (
    company: string,
    inventory: string,
    identity: string,
  ) => {
    await db.query(
      "SELECT set_config('app.company_id',$1,true),set_config('app.inventory_id',$2,true),set_config('app.user_id',$3,true)",
      [company, inventory, identity],
    );
  };
  for (const [company, inventory, expected] of [
    [a, tools, pa],
    [a, parts, pp],
    [b, materials, pb],
  ]) {
    await context(company, inventory, user);
    assert.deepEqual((await db.query("SELECT id FROM products")).rows, [
      { id: expected },
    ]);
    checks++;
  }
  await context(a, tools, inactive);
  const membership = await db.query(
    "SELECT active FROM memberships WHERE company_id=$1",
    [a],
  );
  assert.deepEqual(membership.rows, [{ active: false }]);
  checks++;
  // RLS context is trusted server state; the guard must reject this membership.
  // assertPermission/withInventoryContext are separately tested with inactive/no session.
  await context(a, tools, user);
  await expectFailure("UPDATE stock_movements SET reason='bad'", [], "42501");
  await expectFailure("DELETE FROM audit_logs", [], "42501");
  await db.query("SET LOCAL row_security=off");
  await expectFailure("SELECT * FROM products", [], "42501");
  await db.query("SET LOCAL row_security=on");
  await expectFailure("CREATE TABLE public.forbidden(id int)", [], "42501");
  await expectFailure("SELECT * FROM users", [], "42501");
  return checks;
}
