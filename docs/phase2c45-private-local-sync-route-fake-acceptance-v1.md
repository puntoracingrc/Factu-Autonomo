# Phase 2C.45 private local sync route fake acceptance v1

Marker: PHASE2C45_PRIVATE_LOCAL_SYNC_ROUTE_FAKE_ACCEPTANCE_V1

## Purpose

Acceptance coverage for private local/fake route execution.

## Scenarios

- default disabled;
- local shell without fake remains disabled;
- local fake `dry_run_single`;
- local fake `apply_single`;
- local fake update;
- stale version conflict;
- batch accepted/conflict/rejected;
- protected document rejected;
- cross-user payload rejected;
- non-synthetic id rejected;
- safe report;
- no Supabase, no filesystem, no real documents, no fiscal tables and no XML/QR/AEAT/signature/transport.

## Result

Local acceptance is expected to pass with fake/in-memory service only.
