# PHASE2C17_SUPABASE_LOCAL_SYNC_ACCEPTANCE_OPT_IN_V1

## Objetivo

Preparar una acceptance local opt-in para el adapter Supabase de sync 2C sin
usar produccion, sin remoto y sin migraciones.

## Script

- `scripts/phase2c17-supabase-local-sync-acceptance.test.ts`

## Comportamiento actual

Por defecto el test queda skipped.

Para activarlo se requiere:

- `PHASE2C17_SUPABASE_LOCAL_SYNC_ACCEPTANCE=true`
- `PHASE2C17_SUPABASE_LOCAL_DB_URL` apuntando a `localhost`, `127.0.0.1` o `::1`

Antes de cualquier mutacion sintetica comprueba compatibilidad de columnas para:

- `server_documents`
- `server_document_versions`
- `document_conflicts`

## Estado

El schema actual de 2B no incluye todos los campos de sync 2C necesarios para
aceptacion real con `scope_id`, hashes de sync y versiones de conflicto. Por eso
la fase documenta:

`BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE`

No se crean migraciones para desbloquearlo.

## Datos

Si una fase posterior desbloquea el schema, los datos de acceptance deberan usar
solo identificadores `SYNTHETIC_ONLY_*` y limpiar unicamente esos datos.
