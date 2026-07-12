# Fiscal Models module instructions

These instructions apply only to `src/lib/fiscal-models/**` and supplement the
repository root instructions. The root `AGENTS.md` remains authoritative.

## Allowed in this foundation

- Versioned metadata for AEAT tax-model identities and official AEAT/BOE sources.
- Pure catalog lookup, coverage calculation, fail-closed read contracts, and tests.
- Synthetic, explicitly unverified fixtures for models 036 and 303.
- Historical metadata for model 037, never a current filing option.

## Hard boundaries

- Do not add tax boxes, amounts, deadlines, obligations, calculations, filing
  actions, recommendations, OCR, AI, presentation, signature, payment, or AEAT
  transport logic.
- Do not import `taxes.ts`, `tax-engine`, AppStore, BusinessProfile, storage,
  Supabase, billing, fiscal notifications, fiscal calendar, or VeriFactu modules.
- Do not perform network, filesystem, storage, or remote-service access from the
  catalog, coverage, fixtures, or read service.
- Do not use real declarations or personal data. Fixtures remain synthetic and
  `PENDING_REVIEW` until a later, explicitly approved publication workflow.
- Unknown, unsupported, stale, inconsistent, or unreviewed knowledge must return
  `BLOCKED` or `MANUAL_REVIEW`; never coerce it to zero, success, or `CURRENT`.
- This file does not authorize publication, production enablement, remote writes,
  commits, pushes, pull requests, merges, or deployments.

## Minimum verification

- Keep inputs exact and bounded; do not trim or coerce model codes or tax years.
- Keep returned catalogs immutable or defensively copied.
- Use only HTTPS sources on the explicit AEAT/BOE allowlist.
- Run targeted tests, typecheck, lint, the reasonable project suite, and build.
