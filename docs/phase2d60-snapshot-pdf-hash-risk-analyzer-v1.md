# Phase 2D.60 - Snapshot/PDF hash risk analyzer v1

Marker: `PHASE2D60_SNAPSHOT_PDF_HASH_RISK_ANALYZER_V1`

Status: evidence tecnica interna for local data safety and data-loss regression.

## Scope

Adds a pure analyzer for snapshot hash and PDF hash reference risks.

Implemented in:

- `src/lib/local-data-safety/snapshot-pdf-hash-risk.ts`
- `src/lib/local-data-safety/snapshot-pdf-hash-risk.test.ts`

## Risks

- Snapshot hash mismatch.
- PDF snapshot hash mismatch.
- Snapshot missing on protected document.
- PDF hash missing on protected document.
- Incoming backup attempts to replace a frozen hash.
- Legacy fallback required.

## Boundaries

Summaries include safe references only, not complete snapshots and not PDF bodies. No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `validate:phase2d60-snapshot-pdf-hash-risk-analyzer` and unit tests.
