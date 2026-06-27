# Phase 2D.89 - Hidden import/restore UI no-route acceptance v1

Marker: `PHASE2D89_HIDDEN_IMPORT_RESTORE_UI_NO_ROUTE_ACCEPTANCE_V1`

Status: evidencia tecnica interna, no-route acceptance.

## Scope

Adds acceptance coverage that checks the hidden/routeless shell is not connected from `src/app`, does not create app routes/pages and does not import router/link navigation APIs.

Implemented in:

- `scripts/phase2d89-hidden-import-restore-ui-no-route-acceptance.test.ts`

## Boundaries

No public route, no page, no navigation/menu/sidebar import and no connected export from app.

## Validation

Covered by `test:phase2d89-hidden-import-restore-ui-no-route-acceptance` and `validate:phase2d89-hidden-import-restore-ui-no-route-acceptance`.
