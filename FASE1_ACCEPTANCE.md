# Fase 1 Acceptance - Factura Autonomo

Fecha: 2026-06-24
Estado: **ACEPTADA EN SUPABASE LOCAL**

## Resumen

Se ejecuto la aceptacion dinamica de Fase 1 contra Supabase local, sin usar produccion y sin deploy.

Commit funcional de Fase 1:

```text
8f7d751 feat(security): harden billing and ai usage controls
```

Resultado final:

```text
npm run test:phase1-acceptance
Phase 1 acceptance checks passed.
```

Durante la validacion aparecieron dos problemas reales de reproducibilidad local y se corrigieron:

- Supabase CLI ejecuta todo `*.sql` dentro de `supabase/migrations`; los rollback `*.down.sql` no pueden vivir ahi. Se movieron a `supabase/rollbacks`.
- Supabase CLI usa el prefijo numerico como version de migracion; dos migraciones con `20260624_...` chocaban. Se renombraron con versiones unicas.

Tambien se anadio una migracion base local para que un `supabase start` limpio cree el esquema base antes de aplicar Fase 1.

## Entorno Local

Herramientas disponibles:

- Supabase CLI: `2.107.0`
- Docker: disponible y arrancado
- `psql`: disponible

Servicios usados:

- Supabase API local: `http://127.0.0.1:54321`
- PostgreSQL local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- App local: `http://127.0.0.1:3000`

No se usaron claves ni URLs de produccion.

## Migraciones Aplicadas

Orden verificado en Supabase local limpio:

1. `supabase/migrations/20260623000000_base_schema.sql`
2. `supabase/migrations/20260624000100_phase1_hardening.sql`
3. `supabase/migrations/20260624000200_phase1_rpc_search_path_hardening.sql`

Rollbacks disponibles, no autoejecutables por Supabase CLI:

1. `supabase/rollbacks/20260624000200_phase1_rpc_search_path_hardening.down.sql`
2. `supabase/rollbacks/20260624000100_phase1_hardening.down.sql`

Secuencia validada por el script:

```text
base -> up -> down -> up
```

## Estrategia de Migraciones

### Escenario 1: Supabase limpio o staging nuevo

Un entorno limpio puede aplicar en orden:

1. `supabase/migrations/20260623000000_base_schema.sql`
2. `supabase/migrations/20260624000100_phase1_hardening.sql`
3. `supabase/migrations/20260624000200_phase1_rpc_search_path_hardening.sql`

Esto fue verificado con `supabase stop --no-backup && supabase start` contra Supabase local limpio.

### Escenario 2: Supabase produccion existente

No se ha conectado a produccion, no se han usado claves de produccion y no se han aplicado migraciones reales en produccion.

Por tanto, la existencia actual de tablas en produccion debe confirmarse antes de desplegar con una consulta de solo lectura. Procedimiento recomendado:

1. Confirmar si produccion ya tiene las tablas creadas manualmente:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'user_backups',
    'sync_entities',
    'user_subscriptions',
    'user_usage',
    'payment_receipts',
    'stripe_events',
    'referral_codes',
    'referral_redemptions',
    'verifactu_records',
    'verifactu_chain_state'
  )
order by table_name;
```

2. Si produccion ya tiene el esquema base manual, no aplicar `20260623000000_base_schema.sql` como cambio funcional en caliente. En su lugar:

- verificar columnas, constraints y policies existentes contra staging;
- marcar la migracion base como baseline/aplicada en el historial de migraciones de Supabase, si corresponde;
- aplicar despues solo:
  - `20260624000100_phase1_hardening.sql`
  - `20260624000200_phase1_rpc_search_path_hardening.sql`

3. Si produccion no tiene historial de migraciones pero si tablas creadas manualmente, usar primero una copia staging de produccion y repetir `npm run test:phase1-acceptance` contra staging antes de tocar produccion.

4. No marcar produccion como lista hasta haber validado la matriz de permisos real en produccion o staging clonado.

Motivo: la migracion base es idempotente para entornos limpios y staging, pero en produccion existente puede recrear temporalmente policies antiguas antes de que Fase 1 las endurezca. Para evitar cualquier ventana de permisos, produccion debe tratar `20260623000000_base_schema.sql` como baseline si el esquema ya existe.

## Comandos Ejecutados

Arranque limpio reproducible:

```bash
supabase stop --no-backup && supabase start
```

Resultado: Supabase local arranco correctamente aplicando migraciones en orden.

Aceptacion dinamica:

```bash
npm run test:phase1-acceptance
```

Resultado exacto:

```text
> factura-autonomo@0.1.0 test:phase1-acceptance
> node scripts/phase1-acceptance/run.mjs

Applying base SQL and Phase 1 migrations...
Validating up -> down -> up...
Phase 1 acceptance checks passed.
```

## Matriz de Permisos Final

Permisos efectivos inspeccionados en PostgreSQL local:

| Tabla | anon | authenticated | service_role |
| --- | --- | --- | --- |
| `public.user_subscriptions` | sin permisos | `SELECT` propio por RLS | `ALL` |
| `public.user_usage` | sin permisos | `SELECT` propio por RLS | `ALL` |
| `public.payment_receipts` | sin permisos | `SELECT` propio por RLS | `ALL` |
| `public.stripe_events` | sin permisos | sin permisos | `ALL` |

Policies finales:

| Tabla | Policy | Rol | Operacion |
| --- | --- | --- | --- |
| `public.user_subscriptions` | `Leer suscripcion propia` | `authenticated` | `SELECT` |
| `public.user_usage` | `Leer uso propio` | `authenticated` | `SELECT` |
| `public.payment_receipts` | `Leer recibos propios` | `authenticated` | `SELECT` |
| `public.stripe_events` | ninguna policy cliente | ninguno | ninguna |

No queda `INSERT`, `UPDATE` ni `DELETE` directo para `anon` o `authenticated` en tablas economicas o de consumo.

## RPC

Funciones revisadas:

| Funcion | Seguridad | `search_path` | PUBLIC | anon | authenticated | service_role |
| --- | --- | --- | --- | --- | --- | --- |
| `public.consume_ai_units` | `SECURITY DEFINER` | `""` | no execute | no execute | no execute | execute |
| `public.grant_ai_credit_units` | `SECURITY DEFINER` | `""` | no execute | no execute | no execute | execute |

Ambas funciones cualifican tablas con esquema `public` y mantienen guard interno para exigir rol `service_role`.

## Ataques Probados

La suite de aceptacion valida por API real:

- `anon` no puede leer ni escribir datos de suscripciones, uso, recibos o eventos Stripe.
- Usuario autenticado A puede leer solo sus propios registros donde corresponde.
- Usuario autenticado A no puede leer datos del usuario B.
- Usuario autenticado no puede insertar, actualizar ni borrar suscripciones, saldos, uso, recibos ni eventos Stripe.
- `stripe_events` no queda expuesta al cliente.
- Las RPC de consumo y concesion de unidades IA no son ejecutables por `PUBLIC`, `anon` ni `authenticated`.
- Las escrituras sensibles pasan por servidor con `service_role`.

## Concurrencia

Pruebas incluidas y pasadas:

- Dos consumos simultaneos con saldo para uno solo.
- Solo un consumo completa.
- El saldo nunca queda negativo.
- Dos concesiones simultaneas suman correctamente sin perder actualizaciones.

## Stripe

Pruebas incluidas y pasadas:

- Firma invalida rechazada.
- Evento nuevo procesado.
- Evento repetido idempotente, sin duplicar efectos.
- Dos peticiones simultaneas con el mismo `stripe_event_id`.
- Evento en estado `failed` reintentable.
- Un evento no se marca como `processed` antes de completar sus efectos.

Estados usados:

- `processing`
- `processed`
- `failed`

Riesgo pendiente: no hay todavia una limpieza/lease automatica para eventos que queden atascados indefinidamente en `processing` por caida del proceso.

## Seguridad de Servidor

Comprobacion del bundle cliente:

```text
Sin coincidencias en .next/static para:
SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, service_role
```

El flujo de parseo IA y trial obtiene el usuario desde el Bearer token. No se confia en `user_id`, `plan`, `status` ni `entitlement` enviados por el cliente.

## Tests y Build

Ejecutado antes del commit:

- `npm test`: **pasa**
  - `Test Files 82 passed (82)`
  - `Tests 314 passed (314)`
- `npm run lint`: **pasa**
- `npm run build`: **pasa**
  - `Compiled successfully`
  - `Generated static pages (58/58)`
- `npm run test:phase1-acceptance`: **pasa**
  - `Phase 1 acceptance checks passed.`

No ejecutado en esta orden:

- `npx tsc --noEmit --pretty false`: se mantiene como deuda previa conocida en tests ajenos a Fase 1.

## Archivos Implicados

Migraciones y aceptacion:

- `supabase/migrations/20260623000000_base_schema.sql`
- `supabase/migrations/20260624000100_phase1_hardening.sql`
- `supabase/migrations/20260624000200_phase1_rpc_search_path_hardening.sql`
- `supabase/rollbacks/20260624000100_phase1_hardening.down.sql`
- `supabase/rollbacks/20260624000200_phase1_rpc_search_path_hardening.down.sql`
- `scripts/phase1-acceptance/run.mjs`
- `scripts/phase1-acceptance/.env.example`
- `scripts/phase1-acceptance/README.md`
- `package.json`

Servidor y seguridad:

- `src/app/api/customers/parse/route.ts`
- `src/app/api/billing/trial/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/lib/billing/server-repository.ts`
- `src/lib/billing/stripe-events.ts`
- `src/lib/billing/scan-usage-server.ts`
- `src/lib/billing/add-scan-credits.ts`
- `src/lib/billing/repository.ts`

Tests:

- `src/app/api/customers/parse/route.test.ts`
- `src/app/api/webhooks/stripe/route.test.ts`
- `src/lib/billing/scan-usage-server.test.ts`
- `vitest.config.ts`

## Riesgos Pendientes

- Falta una estrategia operativa de expiracion o recuperacion automatica para eventos Stripe atascados en `processing`.
- El typecheck global tiene deuda previa en tests ajenos a Fase 1 y debe limpiarse antes de marcar produccion como totalmente saneada.
- Antes de desplegar, hay que aplicar estas migraciones en un entorno staging real y repetir la aceptacion contra staging, sin datos productivos.
