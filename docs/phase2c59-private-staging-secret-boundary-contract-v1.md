# PHASE2C59_PRIVATE_STAGING_SECRET_BOUNDARY_CONTRACT_V1

## Objetivo

Definir el boundary de secrets/variables para private staging sin introducir valores reales, sin imprimir material sensible y sin exponer nada en cliente.

## Reglas

- Solo se aceptan placeholders o referencias runtime.
- Los nombres `NEXT_PUBLIC_` quedan rechazados.
- Cualquier nombre privilegiado de rol de servicio queda rechazado.
- Cualquier material value queda rechazado.
- Los summaries nunca incluyen previews de valores.

## Estado

Esta fase no crea secrets, no modifica env local, no toca Vercel vars y no toca Supabase remoto.

## Evidencia

- Modulo puro server-only: `src/lib/document-sync-integrity/private-staging-secret-boundary.ts`.
- Tests unitarios: `src/lib/document-sync-integrity/private-staging-secret-boundary.test.ts`.
- Validador: `scripts/validate-phase2c59-private-staging-secret-boundary-contract.mjs`.
