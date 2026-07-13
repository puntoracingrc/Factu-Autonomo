# Phase 1 Acceptance Suite

This suite performs destructive checks against a clean local/staging Supabase
project. Do not run it against production.

## Requirements

- Supabase local or disposable staging project.
- `psql` available in `PATH`.
- App server running at `PHASE1_ACCEPTANCE_APP_URL`.
- Environment variables from `.env.example`.

## Command

```bash
npm run test:phase1-acceptance
```

The command exits with a non-zero status if any required check fails.

Stripe coverage includes signed delivery, active leases, reclaim after timeout,
stale attempt tokens, failed-event retry, atomic scan-pack crediting, concurrent
events for the same Checkout Session, unpaid-to-async-paid fulfillment and
rollback when the subscription row is missing. It also verifies that pre-contract
events are parked for manual review, the versioned Checkout provenance is
required, RPCs are service-role-only and rollback is rejected after ledger
traffic. All data uses synthetic local or disposable-staging identities.
Directed unit tests additionally cover provider-idempotent payment receipts and
receipt-only reconciliation after the pack effect has already committed.

## Safety

The script refuses to run unless:

- `PHASE1_ACCEPTANCE_ALLOW_DESTRUCTIVE=true`
- `PHASE1_ACCEPTANCE_TARGET=local` or `staging`
- production-looking app hosts are not used

For staging, also set:

```bash
PHASE1_ACCEPTANCE_STAGING_CONFIRM=I_UNDERSTAND_THIS_IS_DESTRUCTIVE
```
