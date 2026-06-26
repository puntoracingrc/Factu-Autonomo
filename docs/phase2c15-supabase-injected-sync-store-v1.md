# PHASE2C15_SUPABASE_INJECTED_SYNC_STORE_V1

## Objetivo

Crear un store Supabase local/staging inyectado y fakeable para la capa
`document-sync-integrity`.

## Archivo

- `src/lib/document-sync-integrity/supabase-store.ts`

## Operaciones

- `getById(documentId, scope)`
- `listByScope(scope)`
- `putDraft(record)`
- `updateDraft(record, expectedVersion)`
- `deleteDraft(documentId, expectedVersion, scope)`
- `recordConflict(conflict)`
- `getConflicts(scope)`

## Reglas aplicadas

- Todas las queries filtran por `user_id` y, cuando existe, `scope_id`.
- `updateDraft` y `deleteDraft` filtran tambien por `version`.
- Documentos emitidos, bloqueados, cancelados o legacy no borrador se rechazan.
- Los errores de base se transforman en errores controlados sin detalles crudos.
- La version tecnica se registra en `server_document_versions`.
- Los conflictos se registran en `document_conflicts` sin payloads ni cuerpos.

## Limites

- No se crea cliente real.
- No se leen variables de entorno.
- No hay produccion.
- No hay Supabase remoto.
- No hay migraciones.
- No hay endpoint ni UI.
