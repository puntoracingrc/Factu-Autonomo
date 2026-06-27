# Phase 2D.62 - Legacy backup compatibility classifier v1

Marker: `PHASE2D62_LEGACY_BACKUP_COMPATIBILITY_CLASSIFIER_V1`

Status: evidence tecnica interna for local data safety and data-loss regression.

## Scope

Adds a conservative classifier for legacy backup compatibility.

Implemented in:

- `src/lib/local-data-safety/legacy-backup-compatibility.ts`
- `src/lib/local-data-safety/legacy-backup-compatibility.test.ts`

## Cases

- Missing document lifecycle.
- Missing integrity lock.
- Missing snapshot reference.
- Missing PDF hash reference.
- Old payment status.
- Old counters.
- Unknown entity fields.
- Partial AppData.
- Legacy non-draft protected documents.

## Boundaries

The classifier does not migrate data and does not echo unknown payloads. No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `validate:phase2d62-legacy-backup-compatibility-classifier` and unit tests.
