# Neon independiente: preparación manual de desarrollo

Esta guía corresponde al PR #2, rama `feat/neon-integration`. El usuario eligió crear manualmente el proyecto gratuito y configurar las conexiones seguras. No se crearon recursos desde Codex y no existe todavía una conexión Neon verificada en este entorno.

## Destino y exclusiones

| Elemento           | Valor requerido                                                |
| ------------------ | -------------------------------------------------------------- |
| Organización       | Personal de Neon, con permisos para crear un proyecto gratuito |
| Proyecto nuevo     | `inventario-app-development`                                   |
| Rama de desarrollo | `development`, vacía e independiente de producción             |
| Base de desarrollo | `inventario_dev`                                               |
| Rol migrador       | `inventory_migrator`, separado del rol de aplicación           |
| Rol de aplicación  | `inventory_app`, sin privilegios administrativos               |

**No usar `neon-emerald-river` ni su rama `main`, administrada por Vercel y asociada a producción.** No clonar esa rama ni copiar sus credenciales o datos. No cambiar su integración de Vercel, eliminarla ni usarla como alternativa si falla el acceso a la organización personal.

## 1. Crear el proyecto gratuito en Neon Console

1. Ingresar en Neon Console con la cuenta personal y seleccionar una organización personal. Si sólo se ve la organización administrada por Vercel, cambiar a una organización personal que permita crear el proyecto; si no existe esa opción, detenerse y resolverlo con el propietario de la cuenta. No intentar sortear los permisos.
2. Comprobar que el plan y la cuota permiten un proyecto en **Free**. Si la consola exige contratar un plan, agregar recursos pagos o cambiar una suscripción, detenerse: hace falta autorización adicional. Elegir los límites y suspensión automática disponibles en el plan gratuito.
3. Crear `inventario-app-development` como proyecto nuevo, sin importar datos ni derivarlo del proyecto de producción. Elegir una región disponible en Free apropiada para la región del servidor de Vercel.
4. Usar una rama vacía llamada `development`. Si la consola crea inicialmente una rama `main` para el proyecto nuevo, renombrarla cuando sea posible o registrar claramente el nombre/ID elegido antes de continuar; no confundirla con `main` de `neon-emerald-river`. Crear `inventario_dev` en el proyecto nuevo y en esa rama, sin copiar bases existentes.
5. Registrar los identificadores de organización, proyecto y rama, el nombre de la base y los hostnames de los endpoints directo y pooled. **No registrar URLs con contraseña.** Los nombres por sí solos no prueban qué proyecto se está usando: verificar también los IDs y la pertenencia a la organización personal.

## 2. Identificación y autorización antes de escrituras

Compartir únicamente estos datos no secretos para identificar el destino:

```text
Organización personal: <nombre o ID>
Proyecto: inventario-app-development / <project ID>
Rama vacía: development / <branch ID>
Base: inventario_dev
Hostname directo: <endpoint directo, sin URL ni contraseña>
Hostname pooled: <endpoint pooled, sin URL ni contraseña>
Plan: Free, sin recursos pagos
```

Después de confirmar estos datos, autorizar expresamente las operaciones que se quieran delegar. Por ejemplo, reemplazando los marcadores por los IDs reales:

> Autorizo aprovisionar los roles y aplicar las migraciones existentes, además de ejecutar las pruebas de integración con fixtures ficticias revertidas, únicamente en el proyecto inventario-app-development (ID …), rama development (ID …), base inventario_dev. No autorizo operaciones sobre producción ni recursos de pago.

**Este texto de ejemplo no es una autorización ya concedida.** La tarea de preparar conexiones tampoco autoriza migrar o escribir en una base aún no identificada. Las fixtures de integración son escrituras aunque finalicen en ROLLBACK. No ejecutar `db:migrate:dev`, `db:roles:dev` o `test:integration` antes de esa autorización.

## 3. Roles y conexiones seguras

Tras identificar el destino y contar con la autorización pertinente, preparar los roles siguiendo [neon.md](neon.md). El rol migrador debe ser propietario del esquema/objetos y poder asumir `inventory_app` para las pruebas; no necesita ser superusuario. El rol `inventory_app` no puede ser propietario ni tener membresías, SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE o REPLICATION. Las contraseñas se generan y guardan mediante las herramientas seguras de Neon, nunca en SQL versionado.

Configurar en el entorno de ejecución, mediante entrada segura de variables privadas o un `.env.local` ignorado y cargado fuera del chat:

| Variable                | Contenido                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | URL pooled de `inventory_app`, hacia `inventario_dev` en la rama confirmada             |
| `DATABASE_URL_UNPOOLED` | URL directa de `inventory_migrator`, hacia exactamente la misma base/rama               |
| `DB_ENV`                | `development`                                                                           |
| `DB_DEV_HOST`           | Hostname directo exacto confirmado en Neon Console; sin esquema, puerto ni credenciales |

Ambas URLs requieren `sslmode=verify-full`. No publicar sus valores, volcarlos en logs ni pegarlos en mensajes o GitHub. `pg` necesita la contraseña real en su proceso: un placeholder de secreto HTTP del proxy no funciona como contraseña PostgreSQL. No configurar la conexión de producción para hacer pasar verificaciones. Permitir PostgreSQL/TCP al puerto 5432 de **ambos endpoints concretos** desde este entorno; HTTPS por sí solo no permite conectar `pg`.

## 4. Comprobación de lectura antes de migrar

Con el proyecto/rama identificados, usar la conexión directa desde un cliente autorizado o la consola SQL de esa rama para obtener sólo metadatos; no consultar registros de negocio:

```sql
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS connection_role;
SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();
SELECT count(*) AS user_relations
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND n.nspname NOT LIKE 'pg_temp_%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S');
ROLLBACK;
```

Confirmar `database_name = inventario_dev`, el rol previsto y TLS para la conexión utilizada. La vista `pg_stat_ssl` de la consola sólo describe la conexión de esa consola; no certifica el TLS del cliente de la aplicación. Cero relaciones de usuario respalda que no hay tablas de negocio previas. Si el conteo es distinto de cero, revisar su procedencia: extensiones o metadatos pueden explicar objetos, pero no afirmar que la base esté vacía ni examinar datos reales sin permiso. La identidad del proyecto/rama se confirma en Neon Console: estas consultas SQL no la prueban.

Revisar `0000_initial_multiempresa.sql` y `0001_immutable_ledger.sql`; no reemplazarlas ni ejecutar `db:push`. Con autorización exacta y base comprobada, seguir la secuencia de migración, permisos y verificación de [neon.md](neon.md). Registrar por separado conexión real, permisos/RLS, restricciones, inmutabilidad y transacciones/pool. Los tests PGlite locales no sustituyen esos resultados.

## 5. Vercel Preview sin tocar Production

1. Abrir el proyecto Vercel `inventario-app` y revisar sólo los nombres, ámbitos y orígenes de variables. No descargar secretos de producción para inspeccionarlos.
2. Configurar `DATABASE_URL` del proyecto **independiente de desarrollo** sólo para **Preview**, preferentemente limitada a `feat/neon-integration`. Verificar si una integración de almacenamiento está inyectando una URL de `neon-emerald-river` en Preview y corregir exclusivamente el ámbito Preview autorizado; no modificar su conexión de Production.
3. No cargar `DATABASE_URL_UNPOOLED` ni credenciales del migrador en el runtime de Vercel. No usar `NEXT_PUBLIC_*` para secretos. La demo y el build funcionan sin variables privadas.
4. Mantener instalación `npm ci`, build `npm run build`, Node.js 24 y despliegues Preview. No agregar migraciones o seeds al build/deploy ni promover a producción. Revisar los datos de conexión en el panel seguro antes de habilitar cualquier servicio futuro.

## Estado de persistencia

El esquema y las herramientas están preparados para PostgreSQL persistente. La demo sigue mostrando fixtures ficticias y no es una interfaz para guardar datos reales; no se agregó persistencia en localStorage/sessionStorage. Conectar una base o aplicar migraciones no convierte la demo en CRUD. La autenticación y los servicios de escritura serán tareas posteriores, con transacciones, permisos y RLS. Hasta implementarlos y verificarlos, no afirmar que productos o movimientos ya se guardan desde el dashboard.
