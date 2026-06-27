# Phase 2D.87 - Import/restore disabled action bar composition v1

Marker: `PHASE2D87_IMPORT_RESTORE_DISABLED_ACTION_BAR_COMPOSITION_V1`

Status: evidencia tecnica interna, disabled action bar only.

## Scope

Adds a React action bar that renders preview, import, restore, recovery and cancel actions as disabled buttons with visible reasons.

Implemented in:

- `src/components/local-data-safety/ImportRestoreDisabledActionBar.tsx`
- `src/components/local-data-safety/ImportRestoreDisabledActionBar.test.tsx`

## Boundaries

No operational onClick for import/restore, no download, no Blob, no browser storage, no route and no navigation.

## Validation

Covered by `validate:phase2d87-import-restore-disabled-action-bar-composition` and render tests.
