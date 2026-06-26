# PHASE2C21_SUPABASE_LOCAL_SYNC_PERMISSION_GUARD_V1

## Objetivo

Verificar que la migracion 2C.20 no abre escrituras directas inseguras sobre
`server_documents`.

## Test

- `scripts/phase2c21-supabase-local-sync-permission-guard.test.ts`

## Comportamiento

El test es opt-in y local. Por defecto queda skipped.

Requiere:

- `PHASE2C21_SUPABASE_LOCAL_PERMISSION_GUARD=true`
- `PHASE2C_SUPABASE_LOCAL_URL`
- `PHASE2C_SUPABASE_LOCAL_ANON_KEY`
- `PHASE2C_SUPABASE_LOCAL_ADMIN_KEY`

El test rechaza cualquier URL que no sea localhost, `127.0.0.1` o `::1`.

## Casos

- `anon` no puede insertar directamente en `server_documents`.
- usuario autenticado no puede insertar directamente en `server_documents`.
- la limpieza se limita al usuario sintetico local creado por el test.

## Estado por defecto

Skipped seguro si no se habilita Supabase local.

Si la matriz local no esta disponible, se documenta como:

`BLOCKED_PERMISSION_MATRIX_NOT_AVAILABLE_LOCALLY`

## Ejecucion local

Resultado 2026-06-26: PASSED contra Supabase local ya activo.
