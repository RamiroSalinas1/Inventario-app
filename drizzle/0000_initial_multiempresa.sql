CREATE TYPE "public"."membership_role" AS ENUM('company_admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('in', 'out', 'adjustment');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_identity_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "companies_name_not_empty" CHECK (length(trim("companies"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventories_company_id_unique" UNIQUE("company_id","id"),
	CONSTRAINT "inventories_name_not_empty" CHECK (length(trim("inventories"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "inventories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memberships" (
	"company_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_scope_id" UNIQUE("company_id","inventory_id","id"),
	CONSTRAINT "categories_name_not_empty" CHECK (length(trim("categories"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"quantity" numeric(18, 3) DEFAULT '0' NOT NULL,
	"reserved" numeric(18, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_balances_company_id_inventory_id_product_id_location_id_pk" PRIMARY KEY("company_id","inventory_id","product_id","location_id"),
	CONSTRAINT "balances_quantities_valid" CHECK ("inventory_balances"."quantity" >= 0 AND "inventory_balances"."reserved" >= 0 AND "inventory_balances"."reserved" <= "inventory_balances"."quantity" AND "inventory_balances"."quantity" <> 'NaN'::numeric AND "inventory_balances"."reserved" <> 'NaN'::numeric)
);
--> statement-breakpoint
ALTER TABLE "inventory_balances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"alt" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_object_unique" UNIQUE("company_id","inventory_id","object_key"),
	CONSTRAINT "images_order_valid" CHECK ("product_images"."sort_order" >= 0),
	CONSTRAINT "images_object_scoped" CHECK ("product_images"."object_key" LIKE "product_images"."company_id"::text || '/' || "product_images"."inventory_id"::text || '/%')
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"supplier_id" uuid,
	"unit" text DEFAULT 'unidad' NOT NULL,
	"minimum_stock" numeric(18, 3) DEFAULT '0' NOT NULL,
	"unit_cost" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_scope_id" UNIQUE("company_id","inventory_id","id"),
	CONSTRAINT "products_values_valid" CHECK ("products"."minimum_stock" >= 0 AND "products"."minimum_stock" <> 'NaN'::numeric AND "products"."unit_cost" >= 0 AND "products"."unit_cost" <> 'NaN'::numeric AND length(trim("products"."sku")) > 0 AND length(trim("products"."name")) > 0 AND length(trim("products"."unit")) > 0)
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"type" "movement_type" NOT NULL,
	"quantity_delta" numeric(18, 3) NOT NULL,
	"actor_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movements_idempotency_unique" UNIQUE("company_id","inventory_id","idempotency_key"),
	CONSTRAINT "movements_delta_valid" CHECK ("stock_movements"."quantity_delta" <> 'NaN'::numeric AND (("stock_movements"."type" = 'in' AND "stock_movements"."quantity_delta" > 0) OR ("stock_movements"."type" = 'out' AND "stock_movements"."quantity_delta" < 0) OR ("stock_movements"."type" = 'adjustment' AND "stock_movements"."quantity_delta" <> 0))),
	CONSTRAINT "movements_reason_not_empty" CHECK (length(trim("stock_movements"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_scope_id" UNIQUE("company_id","inventory_id","id"),
	CONSTRAINT "suppliers_name_not_empty" CHECK (length(trim("suppliers"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_scope_id" UNIQUE("company_id","inventory_id","warehouse_id","id"),
	CONSTRAINT "locations_name_not_empty" CHECK (length(trim("warehouse_locations"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "warehouse_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_scope_id" UNIQUE("company_id","inventory_id","id"),
	CONSTRAINT "warehouses_name_not_empty" CHECK (length(trim("warehouses"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_inventory_scope_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_actor_membership_fk" FOREIGN KEY ("company_id","actor_user_id") REFERENCES "public"."memberships"("company_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "balances_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "balances_product_scope_fk" FOREIGN KEY ("company_id","inventory_id","product_id") REFERENCES "public"."products"("company_id","inventory_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "balances_location_scope_fk" FOREIGN KEY ("company_id","inventory_id","warehouse_id","location_id") REFERENCES "public"."warehouse_locations"("company_id","inventory_id","warehouse_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "images_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "images_product_scope_fk" FOREIGN KEY ("company_id","inventory_id","product_id") REFERENCES "public"."products"("company_id","inventory_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_scope_fk" FOREIGN KEY ("company_id","inventory_id","category_id") REFERENCES "public"."categories"("company_id","inventory_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_scope_fk" FOREIGN KEY ("company_id","inventory_id","supplier_id") REFERENCES "public"."suppliers"("company_id","inventory_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "movements_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "movements_product_scope_fk" FOREIGN KEY ("company_id","inventory_id","product_id") REFERENCES "public"."products"("company_id","inventory_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "movements_location_scope_fk" FOREIGN KEY ("company_id","inventory_id","warehouse_id","location_id") REFERENCES "public"."warehouse_locations"("company_id","inventory_id","warehouse_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "movements_actor_membership_fk" FOREIGN KEY ("company_id","actor_user_id") REFERENCES "public"."memberships"("company_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "locations_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "locations_warehouse_scope_fk" FOREIGN KEY ("company_id","inventory_id","warehouse_id") REFERENCES "public"."warehouses"("company_id","inventory_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_inventory_fk" FOREIGN KEY ("company_id","inventory_id") REFERENCES "public"."inventories"("company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "inventories_company_name_unique" ON "inventories" USING btree ("company_id",lower(trim("name")));--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_scope_date_idx" ON "audit_logs" USING btree ("company_id","inventory_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("company_id","actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_scope_name" ON "categories" USING btree ("company_id","inventory_id",lower(trim("name")));--> statement-breakpoint
CREATE INDEX "balances_location_idx" ON "inventory_balances" USING btree ("company_id","inventory_id","warehouse_id","location_id");--> statement-breakpoint
CREATE INDEX "images_product_idx" ON "product_images" USING btree ("company_id","inventory_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_scope_sku" ON "products" USING btree ("company_id","inventory_id",lower(trim("sku")));--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("company_id","inventory_id","category_id");--> statement-breakpoint
CREATE INDEX "products_supplier_idx" ON "products" USING btree ("company_id","inventory_id","supplier_id");--> statement-breakpoint
CREATE INDEX "movements_scope_date_idx" ON "stock_movements" USING btree ("company_id","inventory_id","created_at");--> statement-breakpoint
CREATE INDEX "movements_product_idx" ON "stock_movements" USING btree ("company_id","inventory_id","product_id");--> statement-breakpoint
CREATE INDEX "movements_location_idx" ON "stock_movements" USING btree ("company_id","inventory_id","warehouse_id","location_id");--> statement-breakpoint
CREATE INDEX "movements_actor_idx" ON "stock_movements" USING btree ("company_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "suppliers_scope_name_idx" ON "suppliers" USING btree ("company_id","inventory_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_warehouse_name" ON "warehouse_locations" USING btree ("company_id","inventory_id","warehouse_id",lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_scope_name" ON "warehouses" USING btree ("company_id","inventory_id",lower(trim("name")));--> statement-breakpoint
CREATE POLICY "company_scope" ON "companies" AS PERMISSIVE FOR ALL TO public USING ("companies"."id" = nullif(current_setting('app.company_id', true), '')::uuid) WITH CHECK ("companies"."id" = nullif(current_setting('app.company_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "inventory_scope" ON "inventories" AS PERMISSIVE FOR ALL TO public USING ("inventories"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "inventories"."id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("inventories"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "inventories"."id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "own_memberships" ON "memberships" AS PERMISSIVE FOR SELECT TO public USING ("memberships"."user_id" = current_setting('app.user_id', true));--> statement-breakpoint
CREATE POLICY "audit_scope" ON "audit_logs" AS PERMISSIVE FOR ALL TO public USING ("audit_logs"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND ("audit_logs"."inventory_id" IS NULL OR "audit_logs"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid)) WITH CHECK ("audit_logs"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND ("audit_logs"."inventory_id" IS NULL OR "audit_logs"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "categories_scope" ON "categories" AS PERMISSIVE FOR ALL TO public USING ("categories"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "categories"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("categories"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "categories"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "balances_scope" ON "inventory_balances" AS PERMISSIVE FOR ALL TO public USING ("inventory_balances"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "inventory_balances"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("inventory_balances"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "inventory_balances"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "images_scope" ON "product_images" AS PERMISSIVE FOR ALL TO public USING ("product_images"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "product_images"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("product_images"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "product_images"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "products_scope" ON "products" AS PERMISSIVE FOR ALL TO public USING ("products"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "products"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("products"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "products"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "movements_scope" ON "stock_movements" AS PERMISSIVE FOR ALL TO public USING ("stock_movements"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "stock_movements"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("stock_movements"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "stock_movements"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "suppliers_scope" ON "suppliers" AS PERMISSIVE FOR ALL TO public USING ("suppliers"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "suppliers"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("suppliers"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "suppliers"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "locations_scope" ON "warehouse_locations" AS PERMISSIVE FOR ALL TO public USING ("warehouse_locations"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "warehouse_locations"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("warehouse_locations"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "warehouse_locations"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "warehouses_scope" ON "warehouses" AS PERMISSIVE FOR ALL TO public USING ("warehouses"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "warehouses"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid) WITH CHECK ("warehouses"."company_id" = nullif(current_setting('app.company_id', true), '')::uuid AND "warehouses"."inventory_id" = nullif(current_setting('app.inventory_id', true), '')::uuid);