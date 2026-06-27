# Phase 2D.81 - Hidden import/restore UI shell flag contract v1

Marker: `PHASE2D81_HIDDEN_IMPORT_RESTORE_UI_SHELL_FLAG_CONTRACT_V1`

Status: evidencia tecnica interna, hidden/routeless UI shell flag only.

## Scope

Adds an injected flag contract for a future hidden import/restore UI shell. It is disabled by default, rejects public flags, disables production/staging/remote runtimes and only allows local/test `routeless_preview_only` mode through injected values.

Implemented in:

- `src/lib/local-data-safety/hidden-ui-shell-flag.ts`
- `src/lib/local-data-safety/hidden-ui-shell-flag.test.ts`

## Boundaries

No route, no navigation, no product UI enablement, no global environment read, no localStorage read/write, no file picker, no import/restore apply, no Supabase and no production.

## Validation

Covered by `validate:phase2d81-hidden-import-restore-ui-shell-flag-contract` and unit tests.
