# Phase 2C.37 private local sync route execution contract v1

Marker: PHASE2C37_PRIVATE_LOCAL_SYNC_ROUTE_EXECUTION_CONTRACT_V1

## Purpose

Define the private server-side contract that allows local/fake execution of the document sync route shell without making it operative in production.

## Conditions

Local/fake execution is allowed only when all conditions are true:

- `DOCUMENT_SYNC_ROUTE_SHELL_ENABLED === "true"`;
- `DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE === "local_staging_only"`;
- `DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_ENABLED === "true"`;
- `DOCUMENT_SYNC_ROUTE_FAKE_ADAPTER_MODE === "in_memory_local_staging"`;
- environment is not production;
- environment is not remote/staging remote.

Any other combination remains disabled and must not create adapters, execute service code, mutate documents, or touch Supabase.

## Limits

- server-only;
- disabled by default;
- fake adapter only;
- local/staging evidence only;
- no production;
- no Supabase remote;
- no real documents.
