# Phase 2D.59 - Numbering and counters risk analyzer v1

Marker: `PHASE2D59_NUMBERING_COUNTERS_RISK_ANALYZER_V1`

Status: evidence tecnica interna for local data safety and data-loss regression.

## Scope

Adds a pure analyzer for numbering and counter risks in synthetic backups.

Implemented in:

- `src/lib/local-data-safety/numbering-counters-risk.ts`
- `src/lib/local-data-safety/numbering-counters-risk.test.ts`

## Risks

- Incoming counter lower than current.
- Incoming counter higher unexpectedly.
- Emitted number conflict.
- Same series/year collision.
- Missing series.
- Legacy numbering unknown.
- Gaps around issued documents.

## Boundaries

The analyzer does not recalculate numbering, does not renumber documents and does not apply changes. No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `validate:phase2d59-numbering-counters-risk-analyzer` and unit tests.
