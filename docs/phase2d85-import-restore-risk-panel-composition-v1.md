# Phase 2D.85 - Import/restore risk panel composition v1

Marker: `PHASE2D85_IMPORT_RESTORE_RISK_PANEL_COMPOSITION_V1`

Status: evidencia tecnica interna, hidden risk panel only.

## Scope

Adds a React risk panel for severity, data-loss warnings, protected document summary and manual review messaging.

Implemented in:

- `src/components/local-data-safety/ImportRestoreRiskPanel.tsx`
- `src/components/local-data-safety/ImportRestoreRiskPanel.test.tsx`

## Boundaries

No "seguro 100%" copy, no operational apply language in the risk panel, no route, no navigation and no real action.

## Validation

Covered by `validate:phase2d85-import-restore-risk-panel-composition` and render tests.
