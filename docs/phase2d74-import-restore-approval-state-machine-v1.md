# Phase 2D.74 - Import/restore approval state machine v1

Marker: `PHASE2D74_IMPORT_RESTORE_APPROVAL_STATE_MACHINE_V1`

Status: evidencia tecnica interna, approvals model only.

## Scope

Adds a pure approval state machine with states for UX review, legal review, data-loss review, owner decision, future wiring approval, rejection and reset.

Implemented in:

- `src/lib/local-data-safety/import-restore-approval-state-machine.ts`
- `src/lib/local-data-safety/import-restore-approval-state-machine.test.ts`

## Boundaries

Approvals start false. Even `approved_for_future_wiring` does not enable import apply, restore apply, routes or UI wiring in product.

## Validation

Covered by `validate:phase2d74-import-restore-approval-state-machine` and unit tests.
