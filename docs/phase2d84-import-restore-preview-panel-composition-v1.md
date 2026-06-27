# Phase 2D.84 - Import/restore preview panel composition v1

Marker: `PHASE2D84_IMPORT_RESTORE_PREVIEW_PANEL_COMPOSITION_V1`

Status: evidencia tecnica interna, hidden preview panel only.

## Scope

Adds a React preview panel that renders safe counters, review status, preview list items and pagination labels from existing view models.

Implemented in:

- `src/components/local-data-safety/ImportRestorePreviewPanel.tsx`
- `src/components/local-data-safety/ImportRestorePreviewPanel.test.tsx`

## Boundaries

No full payloads, no snapshots, no PDF body, no route, no navigation and no real action.

## Validation

Covered by `validate:phase2d84-import-restore-preview-panel-composition` and render tests.
