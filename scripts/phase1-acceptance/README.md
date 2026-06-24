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

## Safety

The script refuses to run unless:

- `PHASE1_ACCEPTANCE_ALLOW_DESTRUCTIVE=true`
- `PHASE1_ACCEPTANCE_TARGET=local` or `staging`
- production-looking app hosts are not used

For staging, also set:

```bash
PHASE1_ACCEPTANCE_STAGING_CONFIRM=I_UNDERSTAND_THIS_IS_DESTRUCTIVE
```
