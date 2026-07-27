# Central Invoice Authority Status Preflight V1

Marker: `CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1`

Status: read-only operational preflight, no fiscal writes.

This phase adds `/api/central-invoice-authority/status` so a confirmed account
and active cloud device can ask the server whether the central invoice authority
is actually ready before any canary or required rollout. It does not enable
forms, does not emit invoices and does not apply Supabase migrations.

## Flow

1. accepts only `GET` and `OPTIONS`;
2. derives user and `sessionId` from the confirmed Bearer session;
3. applies per-user rate limit;
4. requires an active device token and uses only its server hash;
5. evaluates the activation flags for the authenticated user;
6. probes Supabase with the server client;
7. returns a safe readiness envelope and a boolean summary.

## Supabase probes

The probe is intentionally non-destructive:

- core tables are checked with `select("id", { count: "exact", head: true })`
  and `limit(1)`, so no business rows are returned;
- `issue_central_invoice_v1` is called with deliberately invalid arguments and
  is considered present only when it rejects with
  `invalid central invoice issue command`;
- `list_central_invoice_events_v1` is called with deliberately invalid
  arguments and is considered present only when it rejects with
  `invalid central invoice event pull request`;
- the response never renders document payloads, emitted snapshots, PDF bytes or
  fiscal text.

## Safety

`summary.fiscalWritesPossible` is true only when activation flags already allow
fiscal writes and every read-only readiness check passes. A ready schema with
mode `off` still reports fiscal writes as blocked. A mode requesting writes with
missing schema also reports blocked.

PITR remains optional per ADR-0010. Before general production writes, the
existing gates still require a restorable backup and an isolated restore drill.
