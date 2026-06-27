# Phase 2D.83 - Synthetic import/restore fixture selector model v1

Marker: `PHASE2D83_SYNTHETIC_IMPORT_RESTORE_FIXTURE_SELECTOR_MODEL_V1`

Status: evidencia tecnica interna, synthetic fixture selector only.

## Scope

Adds a selector model over the existing synthetic backup corpus. It lists `SYNTHETIC_ONLY_*` fixtures, selects known synthetic ids and rejects unknown or non-synthetic ids.

Implemented in:

- `src/lib/local-data-safety/synthetic-fixture-selector.ts`
- `src/lib/local-data-safety/synthetic-fixture-selector.test.ts`

## Boundaries

No real file picker, no filesystem intake, no browser storage, no real documents and no raw app data in the selector output.

## Validation

Covered by `validate:phase2d83-synthetic-import-restore-fixture-selector-model` and unit tests.
