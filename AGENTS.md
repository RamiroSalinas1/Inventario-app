# Convenciones de Inventario SaaS

## Alcance y estructura

- Next.js App Router, TypeScript estricto, npm y Node.js 24. Mantener `package-lock.json` actualizado.
- Consultar primero la documentación de la versión instalada en `node_modules/next/dist/docs/`.
- `src/app`: rutas y composición; `src/features/<dominio>`: interfaz y lógica de cada módulo; `src/components/ui`: primitivas shadcn/ui; `src/server`: datos, autenticación y autorización; `src/lib`: utilidades compartidas sin secretos.
- Componentes de servidor por defecto. Usar `"use client"` sólo en límites interactivos. Usar `server-only` en acceso a datos, variables privadas y autenticación.
- Interfaz y documentación en español. Código, tablas y columnas en inglés; tablas SQL en snake_case. Validar entradas con Zod. No usar `any` para evitar tipos.
- No implementar módulos fuera de la tarea. La demo es pública y ficticia; nunca convertir sus selectores en comprobaciones de permisos.

## Seguridad multiempresa

- Cada consulta de negocio debe pasar por `withInventoryContext`, validar una sesión real y una membresía activa en el servidor, y usar la transacción recibida. Agregar filtros explícitos de `companyId` e `inventoryId` además de RLS.
- Nunca aceptar `userId`, rol o condición de superadministrador desde cliente, cookies propias o parámetros. Los identificadores de empresa/inventario del cliente sólo son selectores, nunca autorización.
- No usar cachés globales para datos de tenant. Los contextos RLS usan `set_config(..., true)` dentro de la transacción; nunca `SET` de sesión en un pool.
- `DATABASE_URL` requiere rol sin propiedad de tablas, SUPERUSER o BYPASSRLS. El guard del servidor lo verifica. Separar credenciales de migración. No conceder TRUNCATE, DDL ni modificación de membresías al rol de ejecución.
- Mantener claves foráneas compuestas entre empresa, inventario y entidad. Las ubicaciones siempre pertenecen a un depósito. Stock decimal con `numeric`, no float.
- El superadministrador de plataforma se modela aparte y no evade el guard de tenants; el acceso de soporte explícito y auditado es trabajo futuro.
- Historial y auditoría inmutables. Los próximos servicios de stock deben bloquear/actualizar balances y registrar movimientos + auditoría en una sola transacción con idempotencia. No escribir stock directamente desde la interfaz.
- Better Auth está preparado, sus rutas están deshabilitadas con 503. No reemplazarlo por login ficticio. La activación requiere su propia tarea y pruebas sobre una base autorizada.

## Datos y migraciones

- Nunca versionar `.env.local`, secretos, URLs con credenciales, datos reales, volcados o fotos reales. `.env.example` contiene sólo nombres y valores inocuos.
- Drizzle es la fuente de verdad. Generar SQL con `npm run db:generate`; revisar y versionar SQL, snapshots y journal juntos. Los triggers se mantienen en una migración personalizada.
- No ejecutar migraciones, `db:push`, seeds o escrituras sobre bases reales sin autorización explícita. No ejecutar migraciones de producción ni incluirlas en builds, instalación o CI.
- Probar migraciones en PGlite (memoria) sin `DATABASE_URL`. Para pruebas reales usar después una rama Neon de desarrollo autorizada y conexión directa.

## Validación y entrega

- Ejecutar `npm run check`, `npm run build` y `npm run test:e2e` para cambios relevantes de esta base.
- Mantener pruebas de aislamiento y restricciones; agregar pruebas de comportamiento al introducir servicios o permisos. Cubrir móvil, teclado y estados vacíos.
- No afirmar verificación de conexión o autenticación real si sólo se probó la demo.
- Trabajar en una rama y abrir PR con alcance, verificaciones y limitaciones. No fusionar ni promover a producción sin autorización.
