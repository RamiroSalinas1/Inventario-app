import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { companies, inventories, memberships } from "./tenancy";

const scope = () => ({
  companyId: uuid("company_id").notNull(),
  inventoryId: uuid("inventory_id").notNull(),
});
const identity = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  ...scope(),
});
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const quantity = (name: string) => numeric(name, { precision: 18, scale: 3 });
// Helpers below use built columns, preserving strongly typed composite foreign keys.
import type { AnyPgColumn } from "drizzle-orm/pg-core";
type ScopedColumns = { companyId: AnyPgColumn; inventoryId: AnyPgColumn };
function scopeRules(t: ScopedColumns, name: string) {
  const predicate = sql`${t.companyId} = nullif(current_setting('app.company_id', true), '')::uuid AND ${t.inventoryId} = nullif(current_setting('app.inventory_id', true), '')::uuid`;
  return [
    foreignKey({
      name: `${name}_inventory_fk`,
      columns: [t.companyId, t.inventoryId],
      foreignColumns: [inventories.companyId, inventories.id],
    }).onDelete("restrict"),
    pgPolicy(`${name}_scope`, {
      for: "all",
      using: predicate,
      withCheck: predicate,
    }),
  ];
}

export const categories = pgTable(
  "categories",
  {
    ...identity(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    ...scopeRules(t, "categories"),
    unique("categories_scope_id").on(t.companyId, t.inventoryId, t.id),
    uniqueIndex("categories_scope_name").on(
      t.companyId,
      t.inventoryId,
      sql`lower(trim(${t.name}))`,
    ),
    check("categories_name_not_empty", sql`length(trim(${t.name})) > 0`),
  ],
).enableRLS();

export const suppliers = pgTable(
  "suppliers",
  {
    ...identity(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    createdAt: createdAt(),
  },
  (t) => [
    ...scopeRules(t, "suppliers"),
    unique("suppliers_scope_id").on(t.companyId, t.inventoryId, t.id),
    index("suppliers_scope_name_idx").on(t.companyId, t.inventoryId, t.name),
    check("suppliers_name_not_empty", sql`length(trim(${t.name})) > 0`),
  ],
).enableRLS();

export const products = pgTable(
  "products",
  {
    ...identity(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: uuid("category_id"),
    supplierId: uuid("supplier_id"),
    unit: text("unit").notNull().default("unidad"),
    minimumStock: quantity("minimum_stock").notNull().default("0"),
    unitCost: numeric("unit_cost", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...scopeRules(t, "products"),
    unique("products_scope_id").on(t.companyId, t.inventoryId, t.id),
    uniqueIndex("products_scope_sku").on(
      t.companyId,
      t.inventoryId,
      sql`lower(trim(${t.sku}))`,
    ),
    foreignKey({
      name: "products_category_scope_fk",
      columns: [t.companyId, t.inventoryId, t.categoryId],
      foreignColumns: [
        categories.companyId,
        categories.inventoryId,
        categories.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "products_supplier_scope_fk",
      columns: [t.companyId, t.inventoryId, t.supplierId],
      foreignColumns: [
        suppliers.companyId,
        suppliers.inventoryId,
        suppliers.id,
      ],
    }).onDelete("restrict"),
    index("products_category_idx").on(t.companyId, t.inventoryId, t.categoryId),
    index("products_supplier_idx").on(t.companyId, t.inventoryId, t.supplierId),
    check(
      "products_values_valid",
      sql`${t.minimumStock} >= 0 AND ${t.minimumStock} <> 'NaN'::numeric AND ${t.unitCost} >= 0 AND ${t.unitCost} <> 'NaN'::numeric AND length(trim(${t.sku})) > 0 AND length(trim(${t.name})) > 0 AND length(trim(${t.unit})) > 0`,
    ),
  ],
).enableRLS();

export const warehouses = pgTable(
  "warehouses",
  {
    ...identity(),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: createdAt(),
  },
  (t) => [
    ...scopeRules(t, "warehouses"),
    unique("warehouses_scope_id").on(t.companyId, t.inventoryId, t.id),
    uniqueIndex("warehouses_scope_name").on(
      t.companyId,
      t.inventoryId,
      sql`lower(trim(${t.name}))`,
    ),
    check("warehouses_name_not_empty", sql`length(trim(${t.name})) > 0`),
  ],
).enableRLS();

export const warehouseLocations = pgTable(
  "warehouse_locations",
  {
    ...identity(),
    warehouseId: uuid("warehouse_id").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    ...scopeRules(t, "locations"),
    unique("locations_scope_id").on(
      t.companyId,
      t.inventoryId,
      t.warehouseId,
      t.id,
    ),
    uniqueIndex("locations_warehouse_name").on(
      t.companyId,
      t.inventoryId,
      t.warehouseId,
      sql`lower(trim(${t.name}))`,
    ),
    foreignKey({
      name: "locations_warehouse_scope_fk",
      columns: [t.companyId, t.inventoryId, t.warehouseId],
      foreignColumns: [
        warehouses.companyId,
        warehouses.inventoryId,
        warehouses.id,
      ],
    }).onDelete("restrict"),
    check("locations_name_not_empty", sql`length(trim(${t.name})) > 0`),
  ],
).enableRLS();

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    ...scope(),
    productId: uuid("product_id").notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    locationId: uuid("location_id").notNull(),
    quantity: quantity("quantity").notNull().default("0"),
    reserved: quantity("reserved").notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...scopeRules(t, "balances"),
    primaryKey({
      columns: [t.companyId, t.inventoryId, t.productId, t.locationId],
    }),
    foreignKey({
      name: "balances_product_scope_fk",
      columns: [t.companyId, t.inventoryId, t.productId],
      foreignColumns: [products.companyId, products.inventoryId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "balances_location_scope_fk",
      columns: [t.companyId, t.inventoryId, t.warehouseId, t.locationId],
      foreignColumns: [
        warehouseLocations.companyId,
        warehouseLocations.inventoryId,
        warehouseLocations.warehouseId,
        warehouseLocations.id,
      ],
    }).onDelete("restrict"),
    index("balances_location_idx").on(
      t.companyId,
      t.inventoryId,
      t.warehouseId,
      t.locationId,
    ),
    check(
      "balances_quantities_valid",
      sql`${t.quantity} >= 0 AND ${t.reserved} >= 0 AND ${t.reserved} <= ${t.quantity} AND ${t.quantity} <> 'NaN'::numeric AND ${t.reserved} <> 'NaN'::numeric`,
    ),
  ],
).enableRLS();

export const movementType = pgEnum("movement_type", [
  "in",
  "out",
  "adjustment",
]);
export const stockMovements = pgTable(
  "stock_movements",
  {
    ...identity(),
    productId: uuid("product_id").notNull(),
    warehouseId: uuid("warehouse_id").notNull(),
    locationId: uuid("location_id").notNull(),
    type: movementType("type").notNull(),
    quantityDelta: quantity("quantity_delta").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    ...scopeRules(t, "movements"),
    unique("movements_idempotency_unique").on(
      t.companyId,
      t.inventoryId,
      t.idempotencyKey,
    ),
    foreignKey({
      name: "movements_product_scope_fk",
      columns: [t.companyId, t.inventoryId, t.productId],
      foreignColumns: [products.companyId, products.inventoryId, products.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "movements_location_scope_fk",
      columns: [t.companyId, t.inventoryId, t.warehouseId, t.locationId],
      foreignColumns: [
        warehouseLocations.companyId,
        warehouseLocations.inventoryId,
        warehouseLocations.warehouseId,
        warehouseLocations.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "movements_actor_membership_fk",
      columns: [t.companyId, t.actorUserId],
      foreignColumns: [memberships.companyId, memberships.userId],
    }).onDelete("restrict"),
    index("movements_scope_date_idx").on(
      t.companyId,
      t.inventoryId,
      t.createdAt,
    ),
    index("movements_product_idx").on(t.companyId, t.inventoryId, t.productId),
    index("movements_location_idx").on(
      t.companyId,
      t.inventoryId,
      t.warehouseId,
      t.locationId,
    ),
    index("movements_actor_idx").on(t.companyId, t.actorUserId),
    check(
      "movements_delta_valid",
      sql`${t.quantityDelta} <> 'NaN'::numeric AND ((${t.type} = 'in' AND ${t.quantityDelta} > 0) OR (${t.type} = 'out' AND ${t.quantityDelta} < 0) OR (${t.type} = 'adjustment' AND ${t.quantityDelta} <> 0))`,
    ),
    check("movements_reason_not_empty", sql`length(trim(${t.reason})) > 0`),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    ...identity(),
    productId: uuid("product_id").notNull(),
    objectKey: text("object_key").notNull(),
    alt: text("alt").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    ...scopeRules(t, "images"),
    unique("images_object_unique").on(t.companyId, t.inventoryId, t.objectKey),
    foreignKey({
      name: "images_product_scope_fk",
      columns: [t.companyId, t.inventoryId, t.productId],
      foreignColumns: [products.companyId, products.inventoryId, products.id],
    }).onDelete("restrict"),
    index("images_product_idx").on(t.companyId, t.inventoryId, t.productId),
    check("images_order_valid", sql`${t.sortOrder} >= 0`),
    check(
      "images_object_scoped",
      sql`${t.objectKey} LIKE ${t.companyId}::text || '/' || ${t.inventoryId}::text || '/%'`,
    ),
  ],
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    inventoryId: uuid("inventory_id"),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "audit_inventory_scope_fk",
      columns: [t.companyId, t.inventoryId],
      foreignColumns: [inventories.companyId, inventories.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "audit_actor_membership_fk",
      columns: [t.companyId, t.actorUserId],
      foreignColumns: [memberships.companyId, memberships.userId],
    }).onDelete("restrict"),
    index("audit_scope_date_idx").on(t.companyId, t.inventoryId, t.createdAt),
    index("audit_actor_idx").on(t.companyId, t.actorUserId),
    pgPolicy("audit_scope", {
      for: "all",
      using: sql`${t.companyId} = nullif(current_setting('app.company_id', true), '')::uuid AND (${t.inventoryId} IS NULL OR ${t.inventoryId} = nullif(current_setting('app.inventory_id', true), '')::uuid)`,
      withCheck: sql`${t.companyId} = nullif(current_setting('app.company_id', true), '')::uuid AND (${t.inventoryId} IS NULL OR ${t.inventoryId} = nullif(current_setting('app.inventory_id', true), '')::uuid)`,
    }),
  ],
).enableRLS();
