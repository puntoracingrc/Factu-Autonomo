# Phase 2D.13 import restore review model v1

Marker: `PHASE2D13_IMPORT_RESTORE_REVIEW_MODEL_V1`

## Objetivo

Definir un modelo UI-facing sin UI para que una pantalla futura pueda presentar estado, riesgos y acciones del flujo de import/restore local sin tener que interpretar payloads completos.

## Modelo

Incluye:

- overview;
- backup summary;
- import risks;
- restore risks;
- protected documents count;
- manual review required;
- actions.

## Acciones

- `allowDryRunOnly: true`;
- `allowApplyImport: false`;
- `allowApplyRestore: false`;
- `requiresHumanConfirmation` segun riesgos.

## Limites

- no UI real;
- no route changes;
- no import apply;
- no restore apply;
- no localStorage write;
- no datos reales;
- no Supabase;
- no produccion.

## Evidencia

- `src/lib/local-data-safety/import-restore-review-model.ts`
- `src/lib/local-data-safety/import-restore-review-model.test.ts`
- `validate:phase2d13-import-restore-review-model`

Evidencia tecnica interna; no declara cumplimiento productivo ni habilita operaciones reales.
