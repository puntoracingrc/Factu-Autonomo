# Phase 2C.38 sync route fake adapter factory v1

Marker: PHASE2C38_SYNC_ROUTE_FAKE_ADAPTER_FACTORY_V1

## Purpose

Add a server-only factory for building an in-memory local/staging fake adapter and fake service runtime for the route shell.

## Controls

- uses `createInMemoryDocumentSyncStore`;
- uses `createLocalStagingDocumentSyncAdapter`;
- injects dependencies into the server-only sync service;
- seeds only `SYNTHETIC_ONLY_*` records;
- keeps audit in memory;
- does not read env vars inside the core service.

## Limits

- no Supabase;
- no database;
- no filesystem;
- no network;
- no real documents;
- no persistence.
