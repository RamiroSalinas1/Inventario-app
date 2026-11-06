import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite;
const c1 = id(1),
  c2 = id(2),
  i1 = id(11),
  i2 = id(12),
  i3 = id(13);
const category = id(20),
  supplier = id(21),
  product = id(30),
  foreignProduct = id(31);
const warehouse = id(40),
  location = id(50);

beforeAll(async () => {
  // Embedded PostgreSQL, no network, no DATABASE_URL, no real or persisted data.
  db = new PGlite();
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`drizzle/${file}`, "utf8"));
  await db.exec(`
    INSERT INTO users (id,name,email) VALUES ('u1','Usuario ficticio','test@example.invalid'),('u2','Otro usuario','other@example.invalid');
    INSERT INTO companies (id,name,slug) VALUES ('${c1}','Empresa A','a'),('${c2}','Empresa B','b');
    INSERT INTO memberships (company_id,user_id,role) VALUES ('${c1}','u1','company_admin'),('${c2}','u2','viewer');
    INSERT INTO inventories (id,company_id,name) VALUES ('${i1}','${c1}','General'),('${i2}','${c1}','Repuestos'),('${i3}','${c2}','General');
    INSERT INTO categories (id,company_id,inventory_id,name) VALUES ('${category}','${c1}','${i1}','Categoría');
    INSERT INTO suppliers (id,company_id,inventory_id,name) VALUES ('${supplier}','${c1}','${i1}','Proveedor');
    INSERT INTO products (id,company_id,inventory_id,sku,name,category_id,supplier_id) VALUES ('${product}','${c1}','${i1}','SKU-1','Producto','${category}','${supplier}');
    INSERT INTO products (id,company_id,inventory_id,sku,name) VALUES ('${foreignProduct}','${c2}','${i3}','SKU-1','Producto B');
    INSERT INTO warehouses (id,company_id,inventory_id,name) VALUES ('${warehouse}','${c1}','${i1}','Central');
    INSERT INTO warehouse_locations (id,company_id,inventory_id,warehouse_id,name) VALUES ('${location}','${c1}','${i1}','${warehouse}','A1');
    CREATE ROLE inventory_test NOSUPERUSER NOBYPASSRLS;
    GRANT USAGE ON SCHEMA public TO inventory_test;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO inventory_test;
  `);
});
afterAll(async () => {
  await db?.close();
});

describe("restricciones PostgreSQL multiempresa", () => {
  it("mantiene nombres de inventario únicos por empresa", async () => {
    await expect(
      db.query(
        "INSERT INTO inventories(company_id,name) VALUES ($1,' general ')",
        [c1],
      ),
    ).rejects.toThrow(/unique/i);
  });
  it("rechaza inventarios asociados a otra empresa", async () => {
    await expect(
      db.query(
        "INSERT INTO products(company_id,inventory_id,sku,name) VALUES ($1,$2,'BAD','bad')",
        [c2, i1],
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it.each(["category_id", "supplier_id"])(
    "rechaza %s de otro inventario aunque sea de la misma empresa",
    async (column) => {
      await expect(
        db.query(
          `INSERT INTO products(company_id,inventory_id,sku,name,${column}) VALUES ($1,$2,'BAD','bad',$3)`,
          [c1, i2, column === "category_id" ? category : supplier],
        ),
      ).rejects.toThrow(/foreign key/i);
    },
  );
  it("rechaza stock e imágenes de productos de otra empresa", async () => {
    await expect(
      db.query(
        "INSERT INTO inventory_balances(company_id,inventory_id,product_id,warehouse_id,location_id) VALUES ($1,$2,$3,$4,$5)",
        [c1, i1, foreignProduct, warehouse, location],
      ),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      db.query(
        "INSERT INTO product_images(company_id,inventory_id,product_id,object_key,alt) VALUES ($1,$2,$3,$4,'imagen')",
        [c1, i1, foreignProduct, `${c1}/${i1}/image.png`],
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it("no permite una ubicación de otro depósito", async () => {
    const otherWarehouse = id(41);
    await db.query(
      "INSERT INTO warehouses(id,company_id,inventory_id,name) VALUES ($1,$2,$3,'Secundario')",
      [otherWarehouse, c1, i1],
    );
    await expect(
      db.query(
        "INSERT INTO inventory_balances(company_id,inventory_id,product_id,warehouse_id,location_id) VALUES ($1,$2,$3,$4,$5)",
        [c1, i1, product, otherWarehouse, location],
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it("rechaza una ubicación cuyo depósito pertenece a otro inventario", async () => {
    await expect(
      db.query(
        "INSERT INTO warehouse_locations(company_id,inventory_id,warehouse_id,name) VALUES ($1,$2,$3,'B1')",
        [c1, i2, warehouse],
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it("aísla el inventario y autor de los registros de auditoría", async () => {
    await expect(
      db.query(
        "INSERT INTO audit_logs(company_id,inventory_id,action,entity_type,entity_id) VALUES ($1,$2,'test','product','x')",
        [c2, i1],
      ),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      db.query(
        "INSERT INTO audit_logs(company_id,actor_user_id,action,entity_type,entity_id) VALUES ($1,'u2','test','product','x')",
        [c1],
      ),
    ).rejects.toThrow(/foreign key/i);
  });
  it("exige prefijo de empresa e inventario en las claves de imagen", async () => {
    await expect(
      db.query(
        "INSERT INTO product_images(company_id,inventory_id,product_id,object_key,alt) VALUES ($1,$2,$3,'foreign/image.png','imagen')",
        [c1, i1, product],
      ),
    ).rejects.toThrow(/check constraint/i);
  });
  it("mantiene el SKU único por inventario, ignorando mayúsculas y espacios", async () => {
    await expect(
      db.query(
        "INSERT INTO products(company_id,inventory_id,sku,name) VALUES ($1,$2,' sku-1 ','Duplicado')",
        [c1, i1],
      ),
    ).rejects.toThrow(/unique/i);
    await expect(
      db.query(
        "INSERT INTO products(company_id,inventory_id,sku,name) VALUES ($1,$2,'SKU-1','Permitido')",
        [c1, i2],
      ),
    ).resolves.toBeDefined();
  });
  it("rechaza stock negativo y reservas superiores a existencias", async () => {
    for (const [quantity, reserved] of [
      [-1, 0],
      [2, 3],
    ]) {
      await expect(
        db.query(
          "INSERT INTO inventory_balances(company_id,inventory_id,product_id,warehouse_id,location_id,quantity,reserved) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [c1, i1, product, warehouse, location, quantity, reserved],
        ),
      ).rejects.toThrow(/check constraint/i);
    }
  });
  it("valida signo, autor por empresa e idempotencia de movimientos", async () => {
    const insert = (delta: number, actor: string, key: string) =>
      db.query(
        "INSERT INTO stock_movements(company_id,inventory_id,product_id,warehouse_id,location_id,type,quantity_delta,actor_user_id,reason,idempotency_key) VALUES ($1,$2,$3,$4,$5,'in',$6,$7,'Recepción',$8)",
        [c1, i1, product, warehouse, location, delta, actor, key],
      );
    await expect(insert(-1, "u1", id(60))).rejects.toThrow(/check constraint/i);
    await expect(insert(1, "u2", id(61))).rejects.toThrow(/foreign key/i);
    await insert(1, "u1", id(62));
    await expect(insert(1, "u1", id(62))).rejects.toThrow(/unique/i);
  });
  it("aplica RLS sin contexto, por empresa/inventario y limpia SET LOCAL al terminar", async () => {
    await db.exec("SET ROLE inventory_test");
    try {
      expect((await db.query("SELECT * FROM products")).rows).toHaveLength(0);
      await db.exec("BEGIN");
      try {
        await db.query(
          "SELECT set_config('app.company_id',$1,true),set_config('app.inventory_id',$2,true),set_config('app.user_id','u1',true)",
          [c1, i1],
        );
        expect((await db.query("SELECT * FROM products")).rows).toHaveLength(1);
        expect((await db.query("SELECT * FROM memberships")).rows).toHaveLength(
          1,
        );
        await expect(
          db.query(
            "INSERT INTO products(company_id,inventory_id,sku,name) VALUES ($1,$2,'RLS','bad')",
            [c2, i3],
          ),
        ).rejects.toThrow(/row-level security/i);
      } finally {
        await db.exec("ROLLBACK");
      }
      expect((await db.query("SELECT * FROM products")).rows).toHaveLength(0);
    } finally {
      await db.exec("RESET ROLE");
    }
  });
  it("conserva movimientos y auditoría como registros inmutables", async () => {
    await expect(
      db.exec("UPDATE stock_movements SET reason='Cambio'"),
    ).rejects.toThrow(/inmutable/i);
    await db.query(
      "INSERT INTO audit_logs(company_id,actor_user_id,action,entity_type,entity_id) VALUES ($1,'u1','test','product',$2)",
      [c1, product],
    );
    await expect(db.exec("DELETE FROM audit_logs")).rejects.toThrow(
      /inmutable/i,
    );
  });
});
