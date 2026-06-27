# Phase 2D.18 import restore review flow safe report v1

Marker: `PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1`

## Objetivo

Construir un reporte seguro para el flujo de revision de import/restore local. El reporte agrega summaries y bloqueadores sin incluir AppData completo, documentos completos, clientes completos ni snapshots.

## Incluye

- status;
- severity;
- counts;
- blockers;
- manualReview;
- `applyAllowed: false`;
- `restoreAllowed: false`;
- nextSteps;
- safe summaries.

## Redaccion

El reporte y su funcion de redaccion eliminan campos o valores no aptos relacionados con payloads completos, snapshots, tokens, autorizacion, cookies, claves privadas y PDFs.

## Limites

- no AppData completo;
- no documentos completos;
- no clientes completos;
- no snapshots;
- no PDF;
- no secrets;
- no import apply;
- no restore apply;
- no Supabase;
- no produccion.

## Evidencia

- `src/lib/local-data-safety/import-restore-review-report.ts`
- `src/lib/local-data-safety/import-restore-review-report.test.ts`
- `validate:phase2d18-import-restore-review-flow-safe-report`

Evidencia tecnica interna; no declara cumplimiento productivo ni operativa real.
