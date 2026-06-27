# Phase 2D.70 - Corpus scenario decision matrix v1

Marker: `PHASE2D70_CORPUS_SCENARIO_DECISION_MATRIX_V1`

Status: evidencia tecnica interna, synthetic corpus decision matrix.

## Scope

Classifies every synthetic backup corpus case into preview, manual review, blocked, malformed rejected or too-large review. Each matrix entry keeps case id, scenario, severity, recommended decision, required human review and safe reason.

Implemented in:

- `src/lib/local-data-safety/corpus-scenario-decision-matrix.ts`
- `src/lib/local-data-safety/corpus-scenario-decision-matrix.test.ts`

## Boundaries

The matrix never enables import apply or restore apply. It stores summaries and decisions only, not real documents or full snapshots.

## Validation

Covered by `validate:phase2d70-corpus-scenario-decision-matrix` and unit tests.
