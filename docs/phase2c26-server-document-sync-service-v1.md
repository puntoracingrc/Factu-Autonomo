# PHASE2C26_SERVER_DOCUMENT_SYNC_SERVICE_V1

## Objetivo

Crear un servicio server-only sobre adapters de sync ya existentes.

## Alcance

Archivo principal:

- `src/lib/document-sync-integrity/server-sync-service.ts`

## Dependencias

El servicio recibe por inyeccion:

- adapter local/staging o Supabase local/staging;
- audit sink in-memory opcional.

El servicio no crea cliente Supabase, no lee env vars y no abre rutas.

## Metodos

- `handle`
- `dryRunSingle`
- `applySingle`
- `dryRunBatch`
- `applyBatch`
- `getSafeState`
- `getConflictReport`
- `getSafeReport`

## Protecciones

- Valida comandos server-derived.
- Devuelve resultados serializados de forma segura.
- Audita solo en memoria si se inyecta sink.
- No muta el input del caller.
- No persiste auditoria.

## Validacion

- `src/lib/document-sync-integrity/server-sync-service.test.ts`
- `validate:phase2c26-server-document-sync-service`
