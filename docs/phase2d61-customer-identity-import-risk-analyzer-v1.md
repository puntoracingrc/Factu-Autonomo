# Phase 2D.61 - Customer identity import risk analyzer v1

Marker: `PHASE2D61_CUSTOMER_IDENTITY_IMPORT_RISK_ANALYZER_V1`

Status: evidence tecnica interna for local data safety and data-loss regression.

## Scope

Adds a pure analyzer for customer identity risks in synthetic backup imports.

Implemented in:

- `src/lib/local-data-safety/customer-identity-risk.ts`
- `src/lib/local-data-safety/customer-identity-risk.test.ts`

## Risks

- Duplicate customer id.
- Document references missing customer.
- Customer name mismatch for protected document.
- Possible duplicate by synthetic tax id.
- Merged customer ids conflict.
- Incoming customer overwrites current.

## Boundaries

No auto-merge, no apply, no real NIFs and no real customers. No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `validate:phase2d61-customer-identity-import-risk-analyzer` and unit tests.
