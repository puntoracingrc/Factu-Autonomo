# PHASE2C6_SERVER_SYNC_INTEGRITY_FOUNDATION_CHECKPOINT_V1

Fecha: 2026-06-26
Estado: checkpoint tecnico server-only

PHASE2C_SERVER_SYNC_INTEGRITY_FOUNDATION:
READY FOR LOCAL/STAGING ADAPTER WORK

## Limites

- NO PRODUCTION
- NO SUPABASE PRODUCTION
- NO REAL SYNC
- NO UI
- NO ENDPOINT PUBLIC
- NO MIGRATIONS
- NO REAL DOCUMENT MUTATION
- NO REAL INVOICES

## Resumen 2C.1

Se auditan las superficies actuales de persistencia y sincronizacion: `localStorage`, backup JSON, cola incremental local, `server_documents`, versionado y respuestas seguras. El riesgo principal es reconciliar copias completas o cambios incrementales sin romper bloqueos, estados legacy, hashes congelados o numeracion emitida.

## Resumen 2C.2

Se crea `src/lib/document-sync-integrity/` con una politica server-only pura. La politica acepta borradores seguros, exige `expectedVersion` para mutaciones, rechaza documentos emitidos, cancelados, bloqueados o legacy no borrador, bloquea cambios de hashes congelados y numeracion emitida, rechaza cruces de usuario/scope y evita respuestas amplias.

## Resumen 2C.3

`planDocumentSyncMutation()` llama a la politica y devuelve planes dry-run separados: `allowedMutation`, `rejectedMutation`, `conflict` y `noop`. No persiste, no invoca red, no crea endpoint y no muta los objetos recibidos.

## Resumen 2C.4

`buildDocumentSyncConflict()`, `compareDocumentSyncVersions()` e `isExpectedVersionSatisfied()` centralizan conflictos de version. La salida queda limitada a IDs, versiones, scope servidor y resumen seguro.

## Resumen 2C.5

Los eventos `sync_candidate_received`, `sync_plan_accepted`, `sync_plan_rejected`, `sync_conflict_detected`, `sync_noop` y `protected_document_mutation_blocked` son in-memory. Se redactan cuerpos completos, credenciales y payloads amplios. No hay tabla, persistencia ni transporte.

## Tests y validadores

- Tests unitarios nuevos para politica, planner, conflictos y auditoria.
- Validadores npm 2C.1-2C.6 para documentos, scripts, modulo, ausencia de imports remotos/red, rutas prohibidas y carpeta local de capturas no trackeada.
- Las validaciones completas del repo deben ejecutarse antes de abrir el PR.

## Estado final

La base queda preparada para una fase posterior de adaptador local/staging con mocks o stores controlados. No autoriza sync productivo, no modifica documentos reales y no cambia la experiencia de usuario.

## Siguiente fase recomendada

Crear un adaptador local/staging que consuma esta politica con fixtures seguros e in-memory, mida conflictos y demuestre reconciliacion sin tocar produccion ni endpoints publicos.
