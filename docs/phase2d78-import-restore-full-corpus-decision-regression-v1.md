# Phase 2D.78 - Import/restore full corpus decision regression v1

Marker: `PHASE2D78_IMPORT_RESTORE_FULL_CORPUS_DECISION_REGRESSION_V1`

Status: evidencia tecnica interna, full synthetic corpus regression.

## Scope

Adds regression coverage that walks the full synthetic corpus through the decision matrix and view-model catalog. Each case has a decision, risk classification, disabled apply flags and safe summary. Malformed cases are rejected safely.

Implemented in:

- `scripts/phase2d78-import-restore-full-corpus-decision-regression.test.ts`

## Assertions

The regression confirms all synthetic cases stay preview/manual/block/malformed/too-large only, adversarial cases are rejected or safe, no real apply is enabled and no raw document content is exposed.

## Validation

Covered by `test:phase2d78-import-restore-full-corpus-decision-regression` and `validate:phase2d78-import-restore-full-corpus-decision-regression`.
