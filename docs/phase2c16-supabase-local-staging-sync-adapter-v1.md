# PHASE2C16_SUPABASE_LOCAL_STAGING_SYNC_ADAPTER_V1

## Objetivo

Combinar store Supabase inyectado, planner 2C, control de version y reportes
seguros en un adapter local/staging.

## Archivo

- `src/lib/document-sync-integrity/supabase-adapter.ts`

## Metodos

- `plan(candidate)`
- `apply(candidate)`
- `getSafeState(scope)`
- `getConflictReport(scope)`
- `getSafeReport(scope)`

## Estados

- `accepted`
- `rejected`
- `conflict`
- `noop`

## Protecciones

- No expone endpoint.
- No toca UI.
- No conecta produccion.
- No acepta remoto.
- No crea migraciones.
- No muta documentos protegidos.
- No muta emitidas, bloqueadas, canceladas ni legacy no borrador.
- No devuelve payload completo, snapshot completo ni cuerpo PDF.
- Los reportes contienen solo summaries, contadores, razones y conflictos seguros.
