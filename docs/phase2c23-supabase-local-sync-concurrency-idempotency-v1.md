# PHASE2C23_SUPABASE_LOCAL_SYNC_CONCURRENCY_IDEMPOTENCY_V1

## Objetivo

Cubrir carreras basicas de version con el store Supabase inyectado.

## Test

- `scripts/phase2c23-supabase-local-sync-concurrency.test.ts`

## Modo

El test usa fake Supabase client por defecto. No declara acceptance real local.

## Escenarios

- dos updates concurrentes al mismo draft;
- exactamente uno queda `accepted`;
- el otro queda `conflict`;
- replay con el mismo `expectedVersion` queda `conflict` o `noop` controlado;
- no hay doble incremento de version;
- conflict report seguro;
- no snapshots completos;
- no datos reales;
- no tablas fiscales.

## Resultado esperado

Cobertura de concurrencia local/staging con fake client. La acceptance real
queda en 2C.22 cuando Supabase local se habilita explicitamente.
