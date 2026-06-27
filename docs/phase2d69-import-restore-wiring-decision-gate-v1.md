# Phase 2D.69 - Import/restore wiring decision gate v1

Marker: `PHASE2D69_IMPORT_RESTORE_WIRING_DECISION_GATE_V1`

Status: evidencia tecnica interna, decision gate only, no wiring.

## Scope

Adds a pure decision gate for the future import/restore wiring decision. The gate is blocked by default, rejects accidental activation and can only reach owner decision readiness when corpus regression, disabled UI wiring gate, UX/data-loss packet, legal packet, approval template, disabled storage and disabled file picker evidence are all present.

Implemented in:

- `src/lib/local-data-safety/import-restore-wiring-decision-gate.ts`
- `src/lib/local-data-safety/import-restore-wiring-decision-gate.test.ts`

## Boundaries

No UI route, no navigation, no real file picker, no browser storage read/write, no download, no import apply, no restore apply, no real data, no Supabase and no production.

## Validation

Covered by `validate:phase2d69-import-restore-wiring-decision-gate` and unit tests.
