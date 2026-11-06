# Inventario SaaS

Base de una aplicación SaaS de inventarios multiempresa. Esta primera entrega incluye una **demo pública con datos ficticios**, arquitectura modular, esquema PostgreSQL con aislamiento, conexión preparada a Neon y pruebas. No contiene módulos CRUD, autenticación activa ni conexión automática a una base real.

## Stack

Next.js 16.4.5 con App Router, React 19.3, TypeScript estricto, Tailwind CSS 4, shadcn/ui (Radix), Drizzle ORM, PostgreSQL en Neon, Better Auth y Zod. Node.js 24 y npm. Despliegue preparado para Vercel con Fluid Compute.

## Instalación

```bash
git clone https://github.com/RamiroSalinas1/Inventario-app.git
cd Inventario-app
nvm use
npm ci
npm run dev
```

Abrir <http://localhost:3000>. `/` redirige a `/demo`. No hace falta crear un `.env.local` para explorar la demo o compilar. Los selectores cambian los productos, métricas y movimientos de ejemplo; la búsqueda y el filtro de reposición funcionan localmente. No persisten cambios ni establecen una sesión.

## Variables de entorno

Para una futura conexión autorizada, copiar `.env.example` a `.env.local` y completar sus valores. No versionar ese archivo ni usar variables `NEXT_PUBLIC_*` para credenciales.

| Variable                | Uso                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | URL pooled de la rama Neon de desarrollo; rol de aplicación sin propiedad de tablas, SUPERUSER ni BYPASSRLS. |
| `DATABASE_URL_UNPOOLED` | URL directa de la misma rama, con rol de migraciones. Sólo para herramientas de esquema.                     |
| `BETTER_AUTH_SECRET`    | Secreto aleatorio de al menos 32 caracteres, generado y almacenado fuera de Git.                             |
| `BETTER_AUTH_URL`       | Origen exacto de la app; local por defecto en la plantilla. Configurar por entorno al activar auth.          |

Usar TLS verificado (`sslmode=verify-full`) en URLs de Neon. El hostname pooled contiene `-pooler`; la URL directa no. El cliente `pg` se crea de forma diferida, con un pool pequeño y `attachDatabasePool` de Vercel. Ni el build ni la demo llaman al cliente. La validación de variables privadas sólo ocurre al utilizar los servicios del servidor.

**No se crearon recursos de base de datos, se obtuvieron credenciales ni se ejecutaron migraciones remotas en esta entrega.** `DATABASE_URL` está preparado, pero la conexión real no está verificada.

## Estructura

```text
src/app/                 Rutas, layout y demo
src/components/ui/       Componentes shadcn/ui
src/features/demo/       Fixtures públicas y dashboard interactivo
src/server/auth/         Factoría Better Auth, todavía sin rutas activas
src/server/db/schema/    Esquemas auth, tenancy e inventario
src/server/tenancy/      Zod, matriz de permisos y guard transaccional
src/server/env.ts        Validación diferida de variables privadas
drizzle/                 SQL generado, migración de inmutabilidad y metadatos
tests/                   Pruebas unitarias, PostgreSQL en memoria y navegador
docs/security.md         Modelo de aislamiento y roles de base de datos
```

## Modelo inicial

- `users`: identidades globales; `is_platform_admin` separado de los roles de empresa. Tablas `sessions`, `accounts` y `verifications` preparadas para Better Auth.
- `companies` y `memberships`: un usuario puede pertenecer a varias empresas con roles `company_admin`, `operator` o `viewer`; sólo una membresía por empresa/usuario, con estado activo.
- `inventories`: nombres únicos por empresa, ignorando espacios y mayúsculas.
- `products`, `categories`, `suppliers`, `warehouses`: pertenecen a empresa e inventario. Categorías y proveedores se aíslan por inventario en esta primera versión.
- `warehouse_locations`: ubicaciones nombradas dentro de cada depósito. Cada saldo/movimiento exige una ubicación; se podrá crear una ubicación «General» al implementar el alta de depósitos.
- `inventory_balances`: saldo único por producto/ubicación, con cantidad y reserva decimal; cantidades no negativas y reserva no superior al stock.
- `stock_movements`: delta firmado, autor perteneciente a la empresa, motivo e idempotencia por inventario. Entradas positivas, salidas negativas, ajustes distintos de cero.
- `product_images`: metadatos y clave de objeto con prefijo `companyId/inventoryId/`; no implementa almacenamiento ni cargas.
- `audit_logs`: empresa obligatoria, inventario opcional para eventos de empresa, actor miembro de esa empresa cuando está presente. No guardar secretos ni datos de sesión en `metadata`.

Las claves foráneas compuestas impiden referencias entre empresas/inventarios, incluso si se conoce un UUID válido. SKU único por inventario, claves de ubicación que incluyen depósito e historial inmutable mediante triggers. Se restringen borrados que romperían referencias históricas.

Los permisos se comprueban en servidor: administrador gestiona empresa e inventario; operador lee/escribe inventario; consulta sólo lee. La flag de plataforma no concede acceso automático a tenants. La siguiente etapa deberá implementar un flujo explícito y auditado para soporte de plataforma.

## Autenticación y aislamiento

`getAuth()` prepara Better Auth con adaptador Drizzle y tablas propias; no hay usuarios demo en la base ni una sesión simulada. `/api/auth/*` responde **503 `AUTH_NOT_ENABLED`**. El login, registro, invitaciones, recuperación, verificación de correo y limitación distribuida de solicitudes quedan para la próxima etapa.

`withInventoryContext` verifica una sesión real, membresía activa y permiso; valida que el inventario pertenezca a la empresa y fija el contexto RLS sólo dentro de una transacción. Rechaza roles de conexión que puedan omitir RLS. Todos los futuros repositorios deberán usar este guard, sus filtros explícitos y la transacción recibida. No existe una API de negocio accesible desde la demo.

Consultar [docs/security.md](docs/security.md) antes de activar servicios reales. Las políticas RLS son defensa adicional: **no autorizan por sí solas a partir de un ID enviado por el navegador**.

## Esquema y migraciones

```bash
npm run db:generate   # Genera SQL localmente; no conecta ni aplica cambios
npm run db:check      # Comprueba metadatos de migraciones
npm test             # Aplica SQL sólo a PostgreSQL embebido en memoria
```

Se incluyen `0000_initial_multiempresa.sql` y `0001_immutable_ledger.sql`. La primera define tablas, índices, restricciones y RLS; la segunda protege auditoría y movimientos contra UPDATE/DELETE. Drizzle gestiona el journal y los snapshots.

No hay scripts `db:push`, `db:migrate` o `db:seed`; no se ejecuta SQL en instalación, CI o build. Cuando se autorice una base de desarrollo, crear o elegir una rama aislada en Neon, revisar ambas migraciones y usar una conexión directa y un rol de migración. Crear aparte el rol de ejecución descrito en `docs/security.md`. No apuntar herramientas de esquema a producción. Probar concurrencia y transacciones de stock antes de implementar escrituras.

## Verificaciones

```bash
npm run check        # ESLint, tipos, Vitest/PGlite y Drizzle check
npm run build        # Compilación de producción sin secretos
npx playwright install chromium
npm run test:e2e     # Arranca npm start; ejecutar después de build
```

Los tests verifican permisos, rechazo de membresías inactivas, aislamiento de fixtures, claves compuestas, unicidad, cantidades, RLS sin contexto, limpieza transaccional del contexto, inmutabilidad e idempotencia. Playwright cubre navegación móvil y escritorio, búsqueda, filtros, cambio de empresa/inventario y rutas auth cerradas. Son pruebas locales con datos ficticios; no prueban una conexión a Neon ni login real. CI repite estos checks en pull requests, sin credenciales de BD.

## Vercel

Proyecto `inventario-app`, vinculado a este repositorio. Framework Next.js, raíz del repositorio, Node.js 24 (`engines`), instalación `npm ci` y build `npm run build`. La rama de trabajo y el PR sirven para revisar la demo mediante un despliegue Preview; no se debe fusionar ni promover automáticamente a producción.

La demo no necesita variables privadas en Vercel. Al conectar servicios reales, agregar variables por entorno desde la configuración de Vercel, usando una rama Neon de desarrollo para Preview. Nunca reutilizar la URL de producción en previews. El build siempre debe seguir sin migraciones ni seeds.

## Próximos pasos

1. Revisar y aprobar el modelo, en particular el aislamiento del catálogo por inventario.
2. Autorizar una rama Neon de desarrollo; aplicar y verificar las migraciones con roles separados.
3. Completar Better Auth: acceso real, correo verificado, invitaciones, recuperación y rate limiting compartido; probar sesión y permisos de extremo a extremo antes de abrir las rutas.
4. Implementar repositorios y servicios por módulo usando el guard y validaciones Zod; comenzar con empresas, membresías e inventarios.
5. Implementar productos y depósitos; luego stock con transacciones, bloqueo de saldos, idempotencia y auditoría atómica.
6. Agregar carga privada de fotografías y URLs firmadas con permisos; dashboard real e informes con consultas acotadas por tenant.

Convenciones de colaboración en [AGENTS.md](AGENTS.md).
