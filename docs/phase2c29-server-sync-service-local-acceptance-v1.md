# PHASE2C29_SERVER_SYNC_SERVICE_LOCAL_ACCEPTANCE_V1

## Objetivo

Ejecutar acceptance local del servicio server-only de sync documental.

## Test

- `scripts/phase2c29-server-sync-service-local-acceptance.test.ts`

## Modo usado

Modo por defecto:

- `in_memory_local_staging`

El test no necesita Supabase local para pasar. La capa esta preparada para
servicios con adapter inyectado.

## Escenarios

- dry run single create draft;
- apply single create draft;
- apply single update draft;
- stale expected version genera conflict;
- batch accepted + conflict + rejected;
- issued protected rejected;
- locked protected rejected;
- canceled protected rejected;
- legacy no borrador rejected;
- cross-user rejected;
- safe report sin cuerpos completos;
- audit sink sin cuerpos completos.

## Limites

- No produccion.
- No Supabase remoto.
- No endpoints.
- No UI.
- No documentos reales.
- No facturas reales.

## Validacion

- `test:phase2c29-server-sync-service-local-acceptance`
- `validate:phase2c29-server-sync-service-local-acceptance`
