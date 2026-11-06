import type { Queryable } from "./isolation.ts";
export const protectedTables = [
  "companies",
  "memberships",
  "inventories",
  "products",
  "categories",
  "suppliers",
  "warehouses",
  "warehouse_locations",
  "inventory_balances",
  "product_images",
  "stock_movements",
  "audit_logs",
];
export async function verifyRole(client: Queryable) {
  const { rows } =
    await client.query(`select r.rolname, (r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or exists(select 1 from pg_auth_members where member=r.oid) or exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and pg_has_role(r.oid,c.relowner,'USAGE')
  ) or has_schema_privilege(current_user,'public','CREATE') or has_database_privilege(current_user,current_database(),'CREATE')) as unsafe
  from pg_roles r where r.rolname=current_user`);
  if (
    rows.length !== 1 ||
    rows[0].unsafe ||
    rows[0].rolname !== "inventory_app"
  )
    throw new Error("Rol de aplicación inseguro");
  const tables = await client.query(`select c.relname,c.relrowsecurity,
    has_table_privilege(current_user,c.oid,'SELECT') as readable,
    (has_table_privilege(current_user,c.oid,'INSERT') or has_table_privilege(current_user,c.oid,'UPDATE') or has_table_privilege(current_user,c.oid,'DELETE') or has_table_privilege(current_user,c.oid,'TRUNCATE') or has_table_privilege(current_user,c.oid,'TRIGGER') or has_table_privilege(current_user,c.oid,'REFERENCES')) as writable
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`);
  for (const name of protectedTables) {
    const table = tables.rows.find((row) => row.relname === name);
    if (!table?.relrowsecurity || !table.readable || table.writable)
      throw new Error("RLS/grants incompletos");
  }
  for (const name of ["users", "sessions", "accounts", "verifications"]) {
    const result = await client.query(
      "select has_table_privilege(current_user,$1,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') as allowed",
      [`public.${name}`],
    );
    if (result.rows[0].allowed)
      throw new Error("Auth todavía no debe tener permisos");
  }
}
