import "server-only";
import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "@/server/auth";
import { getDb, type Transaction } from "@/server/db";
import { inventories, memberships } from "@/server/db/schema";
import {
  AccessDenied,
  assertPermission,
  inventoryScopeSchema,
  type InventoryScope,
  type Permission,
} from "./permissions";

/** Only this entrypoint establishes tenant context; never take userId/role from a client. */
export async function withInventoryContext<T>(
  input: InventoryScope,
  permission: Permission,
  work: (tx: Transaction, scope: InventoryScope) => Promise<T>,
) {
  const scope = inventoryScopeSchema.parse(input);
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session) throw new AccessDenied(401);

  return getDb().transaction(async (tx) => {
    // Neon owner credentials bypass RLS. Fail closed if used as application credentials.
    const role = await tx.execute<{ unsafe: boolean }>(sql`
      select (r.rolsuper or r.rolbypassrls or r.rolreplication or r.rolcreatedb or r.rolcreaterole
        or has_schema_privilege(current_user, 'public', 'CREATE')
        or has_database_privilege(current_user, current_database(), 'CREATE')
        or exists (select 1 from pg_auth_members where member = r.oid)
        or exists (
        select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relrowsecurity and pg_has_role(r.oid, c.relowner, 'USAGE')
      )) as unsafe from pg_roles r where r.rolname = current_user
    `);
    if (role.rows.length !== 1 || role.rows[0].unsafe)
      throw new Error(
        "DATABASE_URL requiere un rol sin propiedad de tablas, SUPERUSER ni BYPASSRLS",
      );
    // SET LOCAL via set_config is transaction-scoped, including on pooled connections.
    await tx.execute(
      sql`select set_config('app.user_id', ${session.user.id}, true)`,
    );
    const [membership] = await tx
      .select({ role: memberships.role, active: memberships.active })
      .from(memberships)
      .where(
        and(
          eq(memberships.companyId, scope.companyId),
          eq(memberships.userId, session.user.id),
        ),
      )
      .limit(1);
    assertPermission(membership, permission);
    await tx.execute(
      sql`select set_config('app.company_id', ${scope.companyId}, true), set_config('app.inventory_id', ${scope.inventoryId}, true)`,
    );
    const [inventory] = await tx
      .select({ id: inventories.id })
      .from(inventories)
      .where(
        and(
          eq(inventories.companyId, scope.companyId),
          eq(inventories.id, scope.inventoryId),
        ),
      )
      .limit(1);
    if (!inventory) throw new AccessDenied(404);
    return work(tx, scope);
  });
}
