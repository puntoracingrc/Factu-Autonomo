# Phase 2C.42 sync route local fake idempotency replay guard v1

Marker: PHASE2C42_SYNC_ROUTE_LOCAL_FAKE_IDEMPOTENCY_REPLAY_GUARD_V1

## Purpose

Add an in-memory replay guard for local/fake route execution.

## Controls

- in-memory idempotency store;
- optional idempotency for dry-run;
- idempotency enforced for apply operations;
- keys must be safe and synthetic;
- replay returns a controlled safe response;
- unsafe keys are rejected.

## Limits

- local/fake only;
- no database;
- no filesystem;
- no network;
- no persistence;
- no payload echo.
