# Phase 2D.66 - Local data safety corpus regression acceptance v1

Marker: `PHASE2D66_LOCAL_DATA_SAFETY_CORPUS_REGRESSION_ACCEPTANCE_V1`

Status: evidence tecnica interna for synthetic backup corpus, local data safety and data-loss regression.

## Scope

Adds acceptance coverage that walks the synthetic backup corpus through manifest, digest, dry-run, review, safe report, adversarial malformed cases, boundary classification and composite risk aggregation.

Implemented in:

- `scripts/phase2d66-local-data-safety-corpus-regression-acceptance.test.ts`

## Acceptance

The acceptance verifies:

- every synthetic case has a safe manifest;
- every case has a digest or safe validation error;
- review/report summaries remain payload-free;
- protected cases trigger manual review or blocking through the relevant matrix;
- adversarial cases reject or warn without payload echo;
- composite risk keeps `applyAllowed` and `restoreAllowed` false.

## Boundaries

No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `test:phase2d66-local-data-safety-corpus-regression-acceptance` and `validate:phase2d66-local-data-safety-corpus-regression-acceptance`.
