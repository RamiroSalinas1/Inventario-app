-- Run ONLY after migrations, as the migration owner on an authorized dev branch.
-- Create both LOGIN roles and their passwords in Neon Console, never in this file.
DO $$
BEGIN
  IF current_user = 'inventory_app' OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inventory_app') THEN
    RAISE EXCEPTION 'Requiere propietario de migraciones y rol inventory_app existente';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='inventory_app') THEN
    RAISE EXCEPTION 'Quitar membresías heredadas de inventory_app antes de aprovisionar';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND r.rolname='inventory_app') THEN
    RAISE EXCEPTION 'inventory_app no debe ser propietario de objetos';
  END IF;
END $$;
ALTER ROLE inventory_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM inventory_app;
GRANT USAGE ON SCHEMA public TO inventory_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM inventory_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM inventory_app;
GRANT SELECT ON companies, memberships, inventories, products, categories, suppliers,
  warehouses, warehouse_locations, inventory_balances, product_images, stock_movements, audit_logs TO inventory_app;
-- No default grants: future tables/auth/stock writes require a reviewed grant.
