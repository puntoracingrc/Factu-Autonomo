# Phase 2D.45 - Routeless import/restore UI harness scope

Marker: `PHASE2D45_ROUTELESS_IMPORT_RESTORE_UI_HARNESS_SCOPE_V1`

## Objetivo

Definir el alcance del harness de preview import/restore sin ruta, sin navegacion y sin UI conectada.

## Resultado

- `evaluateRoutelessImportRestoreUiHarnessScope(...)`
- `buildRoutelessImportRestoreUiHarnessBlockers(...)`
- `summarizeRoutelessImportRestoreUiHarnessScope(...)`

Estados:

- `blocked_by_default`
- `preview_harness_ready`
- `ready_for_ux_review`
- `rejected`

## Limites

- no route;
- no navigation;
- no file picker real;
- no localStorage read/write;
- no import apply;
- no restore apply;
- no real data.

Evidencia tecnica interna. No habilita cumplimiento productivo ni uso real de import/restore.
