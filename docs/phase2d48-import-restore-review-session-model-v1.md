# Phase 2D.48 - Import/restore review session model

Marker: `PHASE2D48_IMPORT_RESTORE_REVIEW_SESSION_MODEL_V1`

## Objetivo

Agrupar una sesion sintetica de revision para el harness sin persistencia.

## Modelo

- `createImportRestoreReviewSession(...)`
- `updateImportRestoreReviewSession(...)`
- `summarizeImportRestoreReviewSession(...)`

Incluye:

- sessionId sintetico;
- fixture id;
- estado actual;
- resumen de view model;
- flags de revision manual;
- acciones deshabilitadas;
- eventos de auditoria seguros.

No incluye cuerpos completos de documentos ni datos reales. `persisted` queda en `false`.
