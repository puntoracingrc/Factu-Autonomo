# Phase 2D.82 - Routeless import/restore composition root v1

Marker: `PHASE2D82_ROUTELESS_IMPORT_RESTORE_COMPOSITION_ROOT_V1`

Status: evidencia tecnica interna, hidden/routeless composition only.

## Scope

Adds an internal React composition root under `src/components/local-data-safety`. It composes preview, risk, decision and disabled action panels using synthetic harness props.

Implemented in:

- `src/components/local-data-safety/ImportRestoreRoutelessShell.tsx`
- `src/components/local-data-safety/ImportRestoreRoutelessShell.test.tsx`

## Boundaries

No app route, no public page, no navigation, no menu/sidebar connection, no router/link imports, no localStorage read/write, no FileReader, no Blob/download and no import/restore apply.

## Validation

Covered by `validate:phase2d82-routeless-import-restore-composition-root` and component render tests.
