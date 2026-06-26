# Phase 2C.35 disabled sync route shell acceptance v1

Marker: `PHASE2C35_DISABLED_SYNC_ROUTE_SHELL_ACCEPTANCE_V1`

## Objective

Validate locally that the document sync route shell remains disabled by default.

## Acceptance cases

- default `GET` returns controlled disabled response;
- default `POST` returns controlled disabled response;
- disabled `POST` does not echo malicious body content;
- local shell flag still leaves operations disabled;
- unsafe body content is rejected safely when the local shell is explicitly on;
- remote and production-like env values keep the shell disabled;
- route source does not import Supabase or create an operative sync service.

## Command

`npm run test:phase2c35-disabled-sync-route-shell-acceptance`

## Limits

The acceptance is local and synthetic. It does not use production, Supabase
remote, UI, real documents, real invoices or real numbering.
