# PHASE2C22_SUPABASE_LOCAL_SYNC_ACCEPTANCE_V1

## Objetivo

Ejecutar acceptance real del adapter de sync 2C contra Supabase local cuando el
schema local ya es compatible.

## Test

- `scripts/phase2c22-supabase-local-sync-acceptance.test.ts`

## Comportamiento

El test es opt-in y local. Por defecto queda skipped.

Requiere:

- `PHASE2C22_SUPABASE_LOCAL_SYNC_ACCEPTANCE=true`
- `PHASE2C_SUPABASE_LOCAL_URL`
- `PHASE2C_SUPABASE_LOCAL_ADMIN_KEY`

La URL debe ser local. Los datos usan usuario local sintetico y
`local_document_id` con prefijo `SYNTHETIC_ONLY_*`.

## Escenarios

- create draft sintetico;
- update draft con `expectedVersion` correcto;
- update con version antigua genera conflict;
- issued, locked, canceled y legacy no borrador se rechazan;
- cambio de `snapshotHash` se rechaza;
- cambio de `pdfSnapshotHash` se rechaza;
- numeracion emitida no cambia;
- cross-user y cross-scope se rechazan;
- conflict report seguro;
- safe report seguro;
- sin tablas fiscales.

## Limpieza

La limpieza elimina solo filas del usuario local sintetico creado por la prueba.

## Ejecucion local

Resultado 2026-06-26: PASSED contra Supabase local ya activo tras aplicar la
migracion local 2C.20.
