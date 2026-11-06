# Neon: desarrollo aislado y operaciones explícitas

## Estado y alcance

La demo no usa la base de datos. Better Auth continúa cerrado con 503; no hay CRUD ni permisos SQL de escritura de negocio para la aplicación. Las migraciones existentes se conservan sin cambios. Los comandos no se ejecutan desde instalación, build, CI ni despliegue.

No se dispone de credenciales Neon en el entorno de esta tarea: no se crearon recursos remotos ni se aplicaron migraciones reales. Las pruebas PGlite verifican las dos migraciones, el journal Drizzle al aplicarlo dos veces, el SQL de permisos idempotente y el mismo escenario de restricciones/RLS utilizado por integración. No equivalen a verificar red, roles administrados o concurrencia en Neon. La sesión real de Better Auth tampoco está probada.

## Crear y separar los entornos

1. En Neon Console crear o elegir un proyecto PostgreSQL. Mantener la rama de producción separada. Crear una **rama de desarrollo vacía, sin copiar datos de producción**, y una base dedicada a pruebas. Si el proyecto permite elegir la base padre, no elegir una con datos reales. Revisar explícitamente el identificador de rama y endpoint antes de cada operación.
2. Crear un rol propietario de migraciones (por ejemplo `inventory_migrator`) y el LOGIN `inventory_app` en la consola. Generar/almacenar las contraseñas de forma segura en Neon y el gestor de secretos; ningún archivo SQL contiene passwords. Si la consola concede membresía a `neon_superuser` u otro rol a `inventory_app`, revocarla desde una sesión administrativa antes del aprovisionamiento. El script rechaza cualquier membresía heredada del rol de aplicación.
3. La base/esquema y objetos los administra el migrador; nunca `inventory_app`. El migrador necesita CREATE sobre la base y el esquema public, y propiedad de los objetos que modifica. Si el administrador inicial es otro rol, conceder esos permisos o transferir propiedad de forma revisada en esa base vacía; no hacerlo en producción. Para las pruebas con `SET LOCAL ROLE inventory_app`, el migrador debe poder asumir ese rol (un administrador puede conceder `GRANT inventory_app TO inventory_migrator`; esto no hace al app miembro del migrador).
4. En Connection Details elegir la rama/base/rol correctos. La aplicación usa la URL **pooled** (`-pooler`); las herramientas usan la URL **directa** del migrador. En ambas, configurar `sslmode=verify-full`. No usar `sslmode=require`, `rejectUnauthorized:false` ni opciones TLS alternativas. Sólo se admiten los parámetros únicos `sslmode`, `channel_binding` y `application_name`; no se permiten overrides de host/usuario mediante query string. Codificar caracteres especiales de contraseñas según el formato URL. No pegarlas en terminales compartidas, commits o chat.
5. Configurar localmente `.env.local` (ignorado por Git) mediante el gestor seguro. `.env.example` enumera sólo nombres y valores inocuos. `DB_DEV_HOST` es el hostname directo sin esquema, puerto ni credenciales; confirma el destino de desarrollo, pero no demuestra por sí solo que no sea producción. `DB_ENV=development` y `--confirm-development` son confirmaciones operativas; revisar la consola sigue siendo necesario.

## Secuencia reproducible

Desde la raíz del repositorio, Node.js 24 y dependencias instaladas:

```bash
npm run db:check
npm run db:generate             # Sólo al cambiar el esquema; revisar SQL/snapshot/journal
npm run db:migrate:dev -- --confirm-development
npm run db:roles:dev -- --confirm-development
npm run db:verify
npm run test:integration -- --confirm-development
```

**No ejecutar los comandos que escriben sin autorización explícita sobre esa rama concreta.** La tarea de preparar scripts no autoriza cambios en un proyecto remoto existente. `db:generate` produce archivos y no conecta. `db:check` comprueba metadatos, no el estado de una base remota. No hay `db:push`.

`db:migrate:dev` usa el migrador Drizzle y su tabla de journal: aplica primero `0000_initial_multiempresa`, luego `0001_immutable_ledger`, dentro del mecanismo transaccional del migrador. No vuelve a ejecutar SQL ya registrado. Revisar ambas migraciones antes de confirmar. Si una instalación anterior aplicó SQL manualmente sin journal, detenerse y reconciliar el estado en una tarea revisada: no marcar migraciones como ejecutadas a ciegas ni reemplazar las existentes. Las siguientes correcciones deben ser nuevas migraciones.

`db:roles:dev` aplica `scripts/db/roles.sql` en una transacción. Es repetible y endurece un rol **dedicado**: elimina grants directos previos en tablas/secuencias public y concede sólo USAGE/SELECT en las doce tablas protegidas. Revoca CREATE público sobre public en esta base dedicada. No concede escrituras, TRUNCATE, TRIGGER, auth ni privilegios por defecto para tablas futuras. Si hay ownership, membresías o privilegios heredados de PUBLIC no previstos, la verificación falla; revisar y quitar los grants indebidos en la rama aislada. No desactivar RLS. No usar este script para cuentas compartidas con otras aplicaciones.

`db:verify` es de lectura con el LOGIN real de aplicación: comprueba conexión, rol sin privilegios elevados/propiedad/membresías/CREATE, RLS habilitado en todas las tablas, SELECT mínimo, ausencia de permisos de escritura/auth y productos invisibles sin contexto. Un SELECT 1 no bastaría para comprobar estas condiciones.

`test:integration` necesita ambas conexiones y confirmación de desarrollo. Crea fixtures ficticias en una **transacción que termina siempre en ROLLBACK**: Empresa A (Herramientas/Repuestos) y Empresa B (Materiales). Verifica FK entre inventarios/empresas, movimientos cruzados, triggers inmutables incluso como owner, lectura positiva/negativa bajo SET LOCAL ROLE, denegación de DDL/auth/modificación de historial y rechazo de `row_security=off`. No persiste fixtures ni intenta borrarlas saltándose los triggers. Después usa dos clientes simultáneos del pool real con LOGIN de aplicación y verifica ausencia de contexto en la otra conexión y después de COMMIT/ROLLBACK/reutilización. El pooler puede cambiar de backend por transacción: no asumir afinidad de sesión. Una sola conexión válida no certifica estos casos.

El caso de membresía inactiva obtiene la fila real desde PostgreSQL; su rechazo de acceso se verifica en las pruebas del guard/`assertPermission`. Las políticas RLS confían en el contexto del servidor y **no validan membresía ni sesión por sí mismas**. No presentar estas pruebas SQL como autenticación real. Jamás ofrecer al cliente un endpoint para establecer `app.*`.

Los comandos no imprimen URLs ni errores externos completos: sólo estado y SQLSTATE cuando existe. Un fallo sale con código distinto de cero; no se considera un test omitido o exitoso. Sin variables, integración falla explícitamente y debe informarse como pendiente. No añadir secretos para conseguir que el build pase.

## Vercel

| Entorno    | Conexión de aplicación                                             | Migraciones                                           |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Local      | Rama vacía de desarrollo; `inventory_app` pooled                   | Sólo manual y confirmada; URL directa local           |
| Preview    | Rama aislada por preview o desarrollo sin datos reales; rol mínimo | Fuera de build/deploy; operador autorizado            |
| Production | Proyecto/rama y credenciales exclusivos de producción              | Fuera de esta tarea y de estos comandos de desarrollo |

En Vercel Settings → Environment Variables definir `DATABASE_URL` con alcance separado de Preview y Production. Nunca poner `DATABASE_URL_UNPOOLED` ni `DB_ENV=development` en el runtime de producción. No usar NEXT_PUBLIC_*. El pool existente es lazy, reutilizado por proceso, con máximo cinco conexiones y `attachDatabasePool` en Vercel; no se crea por petición. Revisar el presupuesto global de conexiones al aumentar instancias. Los secretos de Better Auth se configurarán al implementar autenticación; no activarla aquí.

La demo y el build siguen sin necesitar credenciales. El build descarga Geist/Geist Mono: el entorno debe permitir fonts.googleapis.com y fonts.gstatic.com mediante el proxy y TLS verificado; ese permiso no está relacionado con Neon. Para Neon, además se requiere acceso de red PostgreSQL/TCP autorizado a los endpoints concretos. No se puede sustituir por un secreto HTTP proxy: `pg` necesita la credencial real en el proceso. No inventar hosts ni abrir comodines globales.

## Validación pendiente en Neon

Con una rama vacía autorizada y variables seguras: ejecutar la secuencia, repetir migración/permisos para comprobar idempotencia real, conservar sólo resultados sin secretos y verificar permisos de Vercel Preview. Hasta entonces no afirmar conexión Neon, migraciones remotas, aislamiento de conexiones reales ni despliegue Preview verificados.
