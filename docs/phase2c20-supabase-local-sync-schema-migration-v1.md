# PHASE2C20_SUPABASE_LOCAL_SYNC_SCHEMA_MIGRATION_V1

## Archivos

- `supabase/migrations/20260626212000_phase2c20_document_sync_local_schema.sql`
- `supabase/rollbacks/20260626212000_phase2c20_document_sync_local_schema.down.sql`

## Tablas tocadas

Solo:

- `server_documents`
- `server_document_versions`
- `document_conflicts`

## Columnas anadidas

`server_documents`:

- `scope_id text`
- `payload_hash text`
- `document_series text`

`server_document_versions`:

- `scope_id text`
- `local_document_id text`
- `operation_kind text`
- `payload_hash text`
- `snapshot_hash text`
- `pdf_content_hash text`
- `safe_summary jsonb`

`document_conflicts`:

- `scope_id text`
- `expected_version integer`
- `local_version integer`
- `remote_version integer`
- `conflict_reason text`
- `safe_summary jsonb`

## Indices

- `server_documents_sync_scope_local_idx`
- `server_documents_sync_scope_version_idx`
- `server_documents_sync_document_user_idx`
- `server_document_versions_sync_scope_document_idx`
- `document_conflicts_sync_scope_status_idx`

## Seguridad

- Migracion idempotente con `add column if not exists`.
- Rollback manual acotado a columnas e indices de 2C.20.
- No hay `DROP TABLE`.
- No hay `TRUNCATE`.
- No hay borrado masivo.
- No hay GRANT amplio a `anon` ni `authenticated`.
- No toca tablas fiscales, Stripe, IA, importadores, UI ni Vercel config.
