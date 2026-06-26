# PHASE2C19_SUPABASE_LOCAL_SCHEMA_GAP_AUDIT_V1

## Alcance

Auditoria del schema Supabase local/staging existente contra las necesidades del
adapter de sync 2C. No se inspecciona ni se toca produccion.

## Tablas actuales relevantes

- `server_documents`
- `server_document_versions`
- `document_conflicts`

## Columnas actuales

`server_documents` ya incluye:

- `id`, `user_id`, `local_document_id`
- `document_type`, `document_kind`
- `document_lifecycle`, `integrity_lock`, `status_legacy`
- `version`, `payload`
- `document_snapshot`, `pdf_snapshot`
- `snapshot_hash`, `pdf_content_hash`
- `issuer_nif`, `numserie`, `issue_date`
- `created_at`, `updated_at`, `issued_at`, `canceled_at`

`server_document_versions` ya incluye:

- `id`, `server_document_id`, `user_id`
- `version`, `change_type`
- `payload_before_hash`, `payload_after_hash`
- `changed_fields`, `actor_type`, `actor_id`, `created_at`

`document_conflicts` ya incluye:

- `id`, `user_id`, `server_document_id`, `local_document_id`
- `conflict_type`, `incoming_payload_hash`, `server_payload_hash`
- `resolution_status`, `created_at`, `resolved_at`

## Requisitos 2C

El adapter 2C requiere:

- scope servidor: `scope_id`
- hash seguro de payload: `payload_hash`
- serie documental opcional: `document_series`
- metadatos de versionado tecnico por scope
- metadatos de conflicto: versiones local/remota/esperada
- resumen seguro opcional para version/conflict rows

## Gap exacto

Faltan:

- `server_documents.scope_id`
- `server_documents.payload_hash`
- `server_documents.document_series`
- `server_document_versions.scope_id`
- `server_document_versions.local_document_id`
- `server_document_versions.operation_kind`
- `server_document_versions.payload_hash`
- `server_document_versions.snapshot_hash`
- `server_document_versions.pdf_content_hash`
- `server_document_versions.safe_summary`
- `document_conflicts.scope_id`
- `document_conflicts.expected_version`
- `document_conflicts.local_version`
- `document_conflicts.remote_version`
- `document_conflicts.conflict_reason`
- `document_conflicts.safe_summary`

## Columnas que no se anaden

No se anaden columnas fiscales, de pago, IA, importadores, UI, PDF historico ni
frontera externa. Tampoco se anaden cuerpos documentales nuevos.

## Riesgos de compatibilidad

- `server_documents.id` sigue siendo `uuid`; los tests locales usan UUIDs
  generados localmente y `local_document_id` sintetico.
- `server_documents.payload` sigue siendo obligatorio por el schema 2B; el mapper
  2C inserta `{}` como payload tecnico vacio, no un documento real.
- No hay backfill masivo de registros legacy.
- Los campos nuevos son nullable para no romper datos existentes.

## Confirmacion

No se toca produccion, Supabase remoto, Vercel config, UI ni documentos reales.
