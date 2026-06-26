# Phase 2C.33 sync route auth context adapter v1

Marker: `PHASE2C33_SYNC_ROUTE_AUTH_CONTEXT_ADAPTER_V1`

## Objective

Define the server-derived auth boundary for a future private route execution
phase without wiring production auth.

## Behavior

- the route shell does not trust user or scope identity from request payloads;
- missing auth returns a safe missing auth context;
- disabled route state returns `disabled_auth_context`;
- tests can use synthetic local context with `SYNTHETIC_ONLY_*` identifiers.

## Safe summary

The summary contains only coarse status, reason, request id and synthetic test
identity when explicitly created by a local helper. It does not echo cookies,
headers or credential-like values.

## Limits

- server-only boundary;
- no production auth wiring;
- no Supabase Auth usage;
- no client-side role material;
- no document mutation.
