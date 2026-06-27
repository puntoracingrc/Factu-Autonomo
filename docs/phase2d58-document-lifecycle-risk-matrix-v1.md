# Phase 2D.58 - Document lifecycle risk matrix v1

Marker: `PHASE2D58_DOCUMENT_LIFECYCLE_RISK_MATRIX_V1`

Status: evidence tecnica interna for local data safety and data-loss regression.

## Scope

Adds a pure classifier for document lifecycle import risk. It classifies draft, issued, locked, canceled, sent budget, accepted budget, paid receipt, emitted receipt and legacy non-draft cases.

Implemented in:

- `src/lib/local-data-safety/document-lifecycle-risk-matrix.ts`
- `src/lib/local-data-safety/document-lifecycle-risk-matrix.test.ts`

## Decision model

- Draft documents are reviewable.
- Protected, issued, locked, canceled or legacy non-draft documents require manual review or blocking.
- Unknown status is conservative.
- Apply and restore remain disabled.

## Boundaries

No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `validate:phase2d58-document-lifecycle-risk-matrix` and unit tests.
