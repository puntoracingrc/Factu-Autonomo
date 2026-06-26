# PHASE2C18_SUPABASE_LOCAL_SYNC_ADAPTER_CHECKPOINT_V1

## Estado

PHASE2C_SUPABASE_LOCAL_SYNC_ADAPTER:
BLOCKED_SCHEMA_NOT_COMPATIBLE_WITH_2C_SYNC_ACCEPTANCE

## Resumen

La capa Supabase local/staging queda disenada con:

- contrato server-only;
- cliente inyectado y fakeable;
- mapper seguro DB hacia sync integrity;
- store Supabase async;
- adapter local/staging;
- tests unitarios con fake client;
- acceptance local opt-in bloqueada por schema actual.

## Limites confirmados

- NO PRODUCTION
- NO SUPABASE PRODUCTION
- NO SUPABASE REMOTE
- NO MIGRATIONS
- NO PUBLIC ENDPOINT
- NO UI
- NO REAL DOCUMENT MUTATION
- NO REAL INVOICES

## Siguiente fase recomendada

Disenar una fase de compatibilidad de schema local/staging para decidir si se
anaden columnas de sync 2C, se crea una vista segura o se adapta el mapper al
schema existente. Esa fase debe seguir siendo local/staging y requerir aprobacion
separada antes de cualquier migracion.
