# Phase 2D.88 - Hidden import/restore UI shell render harness v1

Marker: `PHASE2D88_HIDDEN_IMPORT_RESTORE_UI_SHELL_RENDER_HARNESS_V1`

Status: evidencia tecnica interna, synthetic render harness only.

## Scope

Builds safe props and a render model for the hidden/routeless shell using synthetic fixtures, existing decision package outputs, warnings and disabled action models.

Implemented in:

- `src/lib/local-data-safety/hidden-ui-shell-render-harness.ts`
- `src/lib/local-data-safety/hidden-ui-shell-render-harness.test.ts`

## Boundaries

Synthetic only, no route, no navigation, no browser storage, no FileReader, no file picker, no download, no import/restore apply and no real documents.

## Validation

Covered by `validate:phase2d88-hidden-import-restore-ui-shell-render-harness` and unit tests.
