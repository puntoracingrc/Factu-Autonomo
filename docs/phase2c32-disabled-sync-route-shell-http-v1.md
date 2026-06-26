# Phase 2C.32 disabled sync route shell HTTP v1

Marker: `PHASE2C32_DISABLED_SYNC_ROUTE_SHELL_HTTP_V1`

## Objective

Add the HTTP route shell for document sync while keeping it non-operative by
default.

## Route

Path:

- `src/app/api/document-sync/route.ts`

Default behavior:

- `GET` returns a controlled 404 disabled response;
- `POST` returns a controlled 404 disabled response;
- the disabled path does not read the request body;
- the disabled path does not invoke the sync service.

Explicit local shell behavior:

- if the private local shell flag is complete, `GET` returns 501 operations
  disabled;
- `POST` parses only a bounded safe envelope and still returns operations
  disabled;
- unsafe bodies get a safe 400 response without echo.

## Protections

- no Supabase client creation;
- no service execution;
- no document mutation;
- no real invoice;
- no public operative endpoint.

## Limits

This is evidence tecnica interna. The route shell is disabled by default and is
not a public sync surface.
