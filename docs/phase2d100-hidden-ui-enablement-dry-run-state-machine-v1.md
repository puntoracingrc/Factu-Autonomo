# Phase 2D.100 - Hidden UI enablement dry-run state machine

Marker: `PHASE2D100_HIDDEN_UI_ENABLEMENT_DRY_RUN_STATE_MACHINE_V1`

This phase adds a pure dry-run state machine for future hidden/routeless enablement review.

States: `not_requested`, `review_requested`, `ux_review_ready`, `legal_review_ready`, `owner_decision_ready`, `future_enablement_ready`, `rejected`.

Events: `request_review`, `mark_ux_ready`, `mark_legal_ready`, `mark_owner_ready`, `reject`, `reset`.

The state machine does not enable UI, change real flags, write config, create routes, connect navigation or apply import/restore.
