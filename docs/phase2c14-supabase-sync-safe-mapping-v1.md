# PHASE2C14_SUPABASE_SYNC_SAFE_MAPPING_V1

## Objetivo

Mapear filas Supabase hacia la politica de sincronizacion 2C usando solo campos
seguros y explicitos.

## Archivo

- `src/lib/document-sync-integrity/supabase-mapping.ts`

## Funciones

- `mapSupabaseDocumentRowToSyncCurrentState(row)`
- `mapSyncMutationToSupabaseDraftUpdate(plan)`
- `mapSupabaseConflictRowToSyncConflict(row)`
- `mapSyncConflictToSupabaseConflictInsert(conflict)`

## Campos permitidos

La seleccion documental usa una allow-list explicita:

- identidad tecnica: `id`, `user_id`, `scope_id`, `local_document_id`
- control de concurrencia: `version`
- estado: `document_lifecycle`, `integrity_lock`, `status_legacy`
- hashes seguros: `payload_hash`, `snapshot_hash`, `pdf_content_hash`
- numeracion segura: `numserie`, `document_series`
- fechas tecnicas: `created_at`, `updated_at`

No hay `SELECT *` conceptual.

## Protecciones

- No se mapean cuerpos completos.
- No se devuelven snapshots completos.
- No se incluye contenido PDF.
- `user_id` y `scope_id` pertenecen al contexto servidor.
- `document_id` y `version` son obligatorios.
- Estados `issued`, `locked`, `canceled` y legacy no borrador se conservan para
  que la policy los trate como protegidos.
- Filas desconocidas o malformadas fallan con error controlado.
