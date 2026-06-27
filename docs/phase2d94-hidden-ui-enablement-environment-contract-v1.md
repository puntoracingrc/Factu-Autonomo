# Phase 2D.94 - Hidden UI enablement environment contract

Marker: `PHASE2D94_HIDDEN_UI_ENABLEMENT_ENVIRONMENT_CONTRACT_V1`

This phase documents and implements an injected environment contract for future hidden/routeless enablement review.

The contract does not read global environment state directly. It accepts an injected `envLike`, rejects public flags, rejects production/staging/remote runtimes and never requires Vercel config changes.

Documented future keys:

- `IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_REQUESTED`
- `IMPORT_RESTORE_HIDDEN_UI_ENABLEMENT_MODE`
- `IMPORT_RESTORE_HIDDEN_UI_OWNER_APPROVED`

All values are absent or false by default. A safe injected request creates only a dry-run summary and never enables UI by code.
