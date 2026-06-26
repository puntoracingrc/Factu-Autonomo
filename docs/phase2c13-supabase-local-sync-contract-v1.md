# PHASE2C13_SUPABASE_LOCAL_SYNC_CONTRACT_V1

## Objetivo

Definir el contrato server-only para un adaptador Supabase local/staging de
`document-sync-integrity`, sin crear cliente real dentro del modulo y sin leer
configuracion de entorno.

## Contrato

Archivo principal:

- `src/lib/document-sync-integrity/supabase-contract.ts`

Elementos principales:

- `DocumentSyncSupabaseClientLike`
- `DocumentSyncSupabaseStore`
- `DocumentSyncSupabaseRow`
- `DocumentSyncSupabaseVersionRow`
- `DocumentSyncSupabaseConflictRow`
- `DocumentSyncSupabaseAdapterOptions`
- `DocumentSyncSupabaseSafetyMode`

## Reglas de seguridad

- El cliente se inyecta desde fuera.
- El modo por defecto y unico aceptado es `local_staging_only`.
- `production` se rechaza por runtime guard.
- `remote: true` se rechaza por runtime guard.
- `serverScope.userId` es obligatorio y deriva del servidor.
- El contrato no importa SDK Supabase, no llama a `createClient` y no lee
  variables de entorno.

## Alcance

Tablas conceptuales usadas por fases posteriores:

- `server_documents`
- `server_document_versions`
- `document_conflicts`

No se crean migraciones y no se asume compatibilidad completa del schema actual.
