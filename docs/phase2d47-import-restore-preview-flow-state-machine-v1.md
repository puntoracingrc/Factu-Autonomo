# Phase 2D.47 - Import/restore preview flow state machine

Marker: `PHASE2D47_IMPORT_RESTORE_PREVIEW_FLOW_STATE_MACHINE_V1`

## Objetivo

Modelar la interaccion de preview con una maquina de estados determinista e in-memory.

## Estados

- `idle_disabled`
- `fixture_selected`
- `parsing_preview`
- `validation_ready`
- `review_ready`
- `manual_review_required`
- `apply_blocked`
- `error_safe`

## Eventos

- `select_synthetic_fixture`
- `parse_preview`
- `build_review`
- `click_apply_import`
- `click_apply_restore`
- `reset_preview`
- `reject_malformed`

Las transiciones de aplicar importacion/restauracion van siempre a `apply_blocked`. No hay mutacion, ruta, navegacion, localStorage ni lectura de fichero real.
