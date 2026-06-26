# PHASE2C27_SERVER_SYNC_BATCH_PROCESSING_V1

## Objetivo

Procesar batches server-only de sync documental manteniendo orden y resultados
independientes por item.

## Alcance

Archivo principal:

- `src/lib/document-sync-integrity/server-sync-batch.ts`

## Funciones

- `planDocumentSyncBatch`
- `applyDocumentSyncBatch`
- `summarizeDocumentSyncBatchResult`

## Reglas

- Limite por contrato: 25 items por defecto.
- El orden de entrada se conserva.
- Cada item conserva su estado propio.
- `stopOnFirstError` permite cortar tras el primer resultado no aceptado.
- Sin `stopOnFirstError`, un conflicto no detiene el batch.
- El summary no contiene cuerpos completos.

## Estados

- `accepted`
- `conflict`
- `rejected`
- `noop`

## Validacion

- `src/lib/document-sync-integrity/server-sync-batch.test.ts`
- `validate:phase2c27-server-sync-batch-processing`
