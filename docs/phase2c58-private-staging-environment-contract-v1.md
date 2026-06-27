# PHASE2C58_PRIVATE_STAGING_ENVIRONMENT_CONTRACT_V1

## Objetivo

Documentar el contrato de variables futuras para private staging sin crear configuracion real en Vercel, Supabase, produccion ni staging remoto.

## Variables futuras permitidas como contrato

- `DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED`
- `DOCUMENT_SYNC_PRIVATE_STAGING_MODE`
- `DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE`
- `DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH`

No se configuran valores reales en este PR. El contrato se evalua con objetos inyectados en tests, no con entorno real.

## Reglas

- Por defecto queda `inactive`.
- `NODE_ENV=production`, `VERCEL_ENV=production`, `VERCEL_ENV=preview`, `VERCEL_ENV=staging`, `APP_ENV=staging`, `DEPLOY_ENV=staging` o `SUPABASE_ENV=remote` rechazan el contrato.
- Cualquier variable `NEXT_PUBLIC_` relacionada con document sync rechaza el contrato.
- El kill switch fuerza estado inactive.
- No se registran valores, solo nombres de claves y razones.

## Evidencia

- Modulo puro server-only: `src/lib/document-sync-integrity/private-staging-environment.ts`.
- Tests unitarios: `src/lib/document-sync-integrity/private-staging-environment.test.ts`.
- Validador: `scripts/validate-phase2c58-private-staging-environment-contract.mjs`.
