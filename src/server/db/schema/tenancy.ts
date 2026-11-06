import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
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
import { users } from "./auth";

export const membershipRole = pgEnum("membership_role", [
  "company_admin",
  "operator",
  "viewer",
]);
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("companies_name_not_empty", sql`length(trim(${t.name})) > 0`),
    pgPolicy("company_scope", {
      for: "all",
      using: sql`${t.id} = nullif(current_setting('app.company_id', true), '')::uuid`,
      withCheck: sql`${t.id} = nullif(current_setting('app.company_id', true), '')::uuid`,
    }),
  ],
).enableRLS();

export const memberships = pgTable(
  "memberships",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: membershipRole("role").notNull().default("viewer"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.userId] }),
    index("memberships_user_idx").on(t.userId),
    // Membership discovery is limited to the verified identity before selecting a company.
    pgPolicy("own_memberships", {
      for: "select",
      using: sql`${t.userId} = current_setting('app.user_id', true)`,
    }),
  ],
).enableRLS();

export const inventories = pgTable(
  "inventories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("inventories_company_id_unique").on(t.companyId, t.id),
    uniqueIndex("inventories_company_name_unique").on(
      t.companyId,
      sql`lower(trim(${t.name}))`,
    ),
    check("inventories_name_not_empty", sql`length(trim(${t.name})) > 0`),
    pgPolicy("inventory_scope", {
      for: "all",
      using: sql`${t.companyId} = nullif(current_setting('app.company_id', true), '')::uuid AND ${t.id} = nullif(current_setting('app.inventory_id', true), '')::uuid`,
      withCheck: sql`${t.companyId} = nullif(current_setting('app.company_id', true), '')::uuid AND ${t.id} = nullif(current_setting('app.inventory_id', true), '')::uuid`,
    }),
  ],
).enableRLS();
