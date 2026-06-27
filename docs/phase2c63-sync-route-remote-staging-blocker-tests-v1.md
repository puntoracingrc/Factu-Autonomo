# PHASE2C63_SYNC_ROUTE_REMOTE_STAGING_BLOCKER_TESTS_V1

## Objetivo

Cubrir por tests que private staging no se puede activar contra produccion, preview remoto, Supabase remoto, staging remoto activo, endpoint publico operativo ni variables publicas.

## Casos cubiertos

- Route shell disabled by default.
- Produccion rechazada.
- Vercel preview rechazado.
- Variables `NEXT_PUBLIC_` rechazadas.
- Metadata no local del harness rechazada.
- Checklist humana incompleta deja human review.
- Supabase remoto o staging remoto activo dejan rejected.

## Evidencia

- Test: `scripts/phase2c63-sync-route-remote-staging-blocker.test.ts`.
- Script npm: `test:phase2c63-sync-route-remote-staging-blocker`.
- Validador: `scripts/validate-phase2c63-sync-route-remote-staging-blocker-tests.mjs`.
