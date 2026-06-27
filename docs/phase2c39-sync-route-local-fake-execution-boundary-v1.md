# Phase 2C.39 sync route local fake execution boundary v1

Marker: PHASE2C39_SYNC_ROUTE_LOCAL_FAKE_EXECUTION_BOUNDARY_V1

## Purpose

Wire private local/fake execution into `/api/document-sync` while preserving disabled-by-default behavior.

## Behavior

- default route access still returns disabled/not found;
- local shell without fake adapter still returns operations disabled;
- local shell plus fake adapter can execute safe commands against the in-memory fake service only.

## Allowed operations

- `dry_run_single`;
- `apply_single`;
- `dry_run_batch`;
- `apply_batch`;
- `get_safe_state`;
- `get_conflict_report`;
- `get_safe_report`.

## Limits

- fake adapter only;
- `SYNTHETIC_ONLY_*` identifiers only;
- no Supabase;
- no production;
- no public endpoint operative;
- no real document mutation.
