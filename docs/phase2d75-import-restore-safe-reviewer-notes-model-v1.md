# Phase 2D.75 - Import/restore safe reviewer notes model v1

Marker: `PHASE2D75_IMPORT_RESTORE_SAFE_REVIEWER_NOTES_MODEL_V1`

Status: evidencia tecnica interna, safe reviewer notes model only.

## Scope

Adds a safe notes model for reviewers. Notes attach only to synthetic corpus case ids, have a maximum length and reject HTML/script/XML/token-like markers, customer-shaped data and snapshot-shaped content.

Implemented in:

- `src/lib/local-data-safety/import-restore-reviewer-notes.ts`
- `src/lib/local-data-safety/import-restore-reviewer-notes.test.ts`

## Boundaries

Notes are in-memory model values only. They do not attach to real customers, real documents, product UI, storage, imports or restores.

## Validation

Covered by `validate:phase2d75-import-restore-safe-reviewer-notes-model` and unit tests.
