# Aislamiento y activación futura

## Estado de esta entrega

La demo sólo importa fixtures públicas. No hay conexión a Neon, login activo, credenciales o endpoints CRUD. Sus selectores no dan permisos. El código de servidor usa `server-only`; las variables privadas no llegan al navegador.

## Capas del límite de tenant

1. Sesión validada por Better Auth desde los headers de la petición; nunca identidad suministrada por el cliente. No usar sólo la presencia de una cookie como prueba de sesión.
2. Membresía activa consultada para ese usuario y esa empresa en cada operación; permisos verificados en servidor, sin inferirlos del menú.
3. Inventario consultado con empresa e ID. Usuario global con roles independientes por empresa. Superadministrador de plataforma no evita esta validación.
4. Transacción con `set_config('app.user_id', ..., true)`, y luego empresa/inventario autorizados. El contexto desaparece en commit/rollback; el callback debe usar exclusivamente `tx`. Agregar filtros explícitos de empresa/inventario a cada consulta.
5. RLS en empresas, membresías y todas las tablas de negocio. Sin contexto las filas de negocio no son visibles. Membresías sólo permite SELECT de las propias. No hay políticas para crear membresías desde el rol de aplicación.
6. Claves compuestas impiden referenciar filas de otro tenant/inventario; saldos y movimientos validan depósito y ubicación juntos.

Las variables `app.*` las controla exclusivamente el servidor de confianza: un rol SQL con acceso directo podría cambiarlas. Nunca entregar credenciales al cliente ni construir SQL desde entrada sin parametrizar. RLS no sustituye la sesión ni la comprobación de membresía del guard.

## Roles PostgreSQL separados

Neon suele entregar un usuario propietario. Ese usuario **no debe ser `DATABASE_URL` de la aplicación**. Los propietarios, superusuarios y roles BYPASSRLS pueden omitir políticas; `withInventoryContext` rechaza esas conexiones. No se han creado roles reales en esta tarea.

En una futura rama autorizada:

- Rol de migración: propietario del esquema y DDL, sólo para la conexión directa y herramientas de revisión/aplicación.
- Rol de ejecución: LOGIN, NOSUPERUSER, NOBYPASSRLS, sin pertenecer al rol propietario, sin permisos DDL ni TRUNCATE. Dar USAGE en `public`; SELECT en companies, memberships, inventories y tablas de negocio; los próximos módulos recibirán sólo los INSERT/UPDATE necesarios.
- Al activar Better Auth, conceder al rol que use su adaptador únicamente los permisos necesarios en users, sessions, accounts y verifications. `is_platform_admin` no se expone como `additionalFields` de entrada ni se puede modificar desde el cliente.
- No conceder UPDATE/DELETE a stock_movements ni audit_logs; los triggers también rechazan esos cambios. Sus futuros servicios sólo agregan eventos. No otorgar permisos para desactivar triggers.
- Altas de empresa/membresía requieren un servicio de aprovisionamiento específico, de alcance limitado y auditado; el guard de inventarios no implementa ese flujo.

Las pruebas usan un rol PostgreSQL temporal NOSUPERUSER NOBYPASSRLS en PGlite. Ese rol y todos sus datos desaparecen al cerrar la instancia en memoria.

## Antes de datos reales

Probar login/logout, caducidad y revocación, correo verificado, acceso negativo de usuario sin membresía, usuario con varios roles, sesión inválida, empresa/inventario manipulado y membresía desactivada. Probar también conexiones concurrentes del pool, transacciones de stock, doble envío e idempotencia. Esta entrega prueba las restricciones con PostgreSQL embebido; no afirma verificación de autenticación o concurrencia sobre Neon.

La creación de un movimiento aún no actualiza el balance automáticamente. El servicio de stock pendiente deberá realizar ambas escrituras y la auditoría en una única transacción con bloqueo o actualización condicional. No exponer acceso directo a esas tablas. Correcciones mediante movimientos compensatorios; inventarios y referencias históricas se archivan en una futura política, no mediante borrado en cascada.

El almacenamiento de fotos deberá ser privado y validar la pertenencia del producto al generar URLs firmadas. El prefijo de objeto en el esquema no es una política del proveedor de almacenamiento.

## Herramientas de integración Neon

Consultar [docs/neon.md](neon.md). El aprovisionamiento repetible está en `scripts/db/roles.sql`; exige un LOGIN dedicado `inventory_app` existente, sin ownership ni membresías. Los permisos actuales son exclusivamente lectura de tablas de tenant; auth y escrituras siguen cerrados. El guard también rechaza membresías de roles y permisos CREATE/CREATEROLE/CREATEDB, además de ownership y bypass RLS. El verificador operacional comprueba grants efectivos y RLS en todas las tablas esperadas. Nuevas tablas requieren grants explícitos revisados.

`test:integration` sólo puede ejecutarse explícitamente contra desarrollo. Las fixtures y el historial se crean dentro de una transacción revertida; los tests de pool usan conexiones con el LOGIN de aplicación sin persistir datos. Sigue pendiente ejecutarlo en Neon. El contexto SQL no autentica: la membresía inactiva debe ser rechazada por el guard antes de conceder contexto de inventario; no se habilitan rutas Better Auth.
