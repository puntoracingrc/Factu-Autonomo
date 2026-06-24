# Fase 1.5 Acceptance - Quality Gates

Fecha: 2026-06-24
Estado: **ACEPTADA LOCALMENTE / EJECUCION EN GITHUB PENDIENTE**
Rama: `chore/ci-quality-gates`

## Resumen

La mini Fase 1.5 cierra tres puntos del plan de escalabilidad sin tocar funcionalidad de producto, produccion, staging ni Fase 2:

- SR-002: typecheck global en verde.
- SR-013: convencion de migraciones documentada y comprobada automaticamente.
- SR-001: workflow CI preparado con quality gates y aceptacion Supabase local.

El workflow `.github/workflows/ci.yml` aun no se ha ejecutado en GitHub. Solo se ha validado localmente el contenido y la bateria de comandos equivalente.

## Archivos

CI y tooling:

- `.github/workflows/ci.yml`
- `package.json`
- `scripts/check-supabase-migrations.mjs`

Documentacion:

- `supabase/README.md`
- `FASE1_5_ACCEPTANCE.md`

Tests ajustados para typecheck:

- `src/lib/calculations.test.ts`
- `src/lib/cloud/incremental.test.ts`
- `src/lib/factu/occasional.test.ts`
- `src/lib/numbering.test.ts`
- `src/lib/pdf-logo.test.ts`
- `src/lib/share.test.ts`
- `src/lib/suppliers.test.ts`
- `src/lib/verifactu/hash.test.ts`
- `src/lib/verifactu/tipo-factura.test.ts`

## Typecheck

Se corrigieron los 21 errores TypeScript preexistentes sin cambiar `tsconfig`, sin exclusiones globales y sin relajar tipos.

Resumen de correcciones:

- Fixtures de `LineItem`: ahora incluyen `description` o usan un helper con valor por defecto.
- Fixtures de sincronizacion: `SyncChange` incluye `deleted`.
- Mock de `localStorage`: tipado sin depender de `this.store` sobre `{}`.
- Fixtures de numeracion: se normalizan con `normalizeNumbering` para incluir `formats`.
- Fixture de plantilla PDF: parte de `DEFAULT_DOCUMENT_TEMPLATE` para incluir fuente y tamanos.
- Fixture de `BusinessProfile`: parte de `DEFAULT_PROFILE` para incluir `iva` y el modelo vigente.
- Fixtures de `Expense`: helper completo con `description`, `category` y `paymentMethod`.
- Vectores VeriFactu: tipados como union discriminada alta/anulacion.
- Rectificativa: se usa `correccion`, el tipo actual, en lugar de `sustitucion`.

## Convencion de Migraciones

Queda documentado en `supabase/README.md`:

- `supabase/migrations` contiene solo migraciones up autoejecutables.
- `supabase/rollbacks` contiene rollback manuales.
- Cada migracion usa version numerica unica `YYYYMMDDHHMMSS`.
- El orden soportado es base/baseline -> migraciones incrementales.
- Los SQL manuales (`schema.sql`, `billing.sql`, etc.) quedan como scripts historicos/legacy y no deben ejecutarse en instalaciones nuevas ni produccion existente.

Comprobacion automatizada:

- `npm run check:migrations`
- falla si existe `*.down.sql` dentro de `supabase/migrations`;
- falla si hay versiones duplicadas;
- falla si los nombres no siguen la convencion;
- falla si un rollback no apunta a una migracion existente.

## CI

Workflow creado:

- `.github/workflows/ci.yml`

Job `quality`:

- `npm ci`
- `npm run check:migrations`
- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Job `supabase-acceptance`:

- Node fijado a 20.
- Supabase CLI fijado a `2.107.0`.
- PostgreSQL client instalado explicitamente para `psql`/`pg_isready`.
- Supabase local iniciado sin secretos de produccion.
- Health check de Supabase local.
- Next local iniciado con credenciales locales.
- Health check de Next.
- `npm run test:phase1-acceptance`.
- Limpieza con `if: always()`.

El workflow usa `permissions: contents: read`, `timeout-minutes` y `concurrency`.

## Resultados Locales

`npm run check:migrations`:

```text
Supabase migration convention check passed (3 migrations, 2 rollbacks).
```

`npm test`:

```text
Test Files  82 passed (82)
Tests  314 passed (314)
```

`npm run lint`:

```text
Pasa sin errores.
```

`npx tsc --noEmit`:

```text
Pasa sin errores.
```

`npm run build`:

```text
Compiled successfully.
Generated static pages (58/58).
```

`npm run test:phase1-acceptance`:

```text
Phase 1 acceptance checks passed.
```

`git diff --check`:

```text
Pasa sin errores.
```

## Riesgos Pendientes

- El workflow aun debe ejecutarse en GitHub para confirmar el comportamiento del runner remoto.
- Produccion no se ha tocado, no se ha migrado y no queda marcada como lista.
- No se ha anadido staging en esta fase.
- No se ha implementado recuperacion de Stripe `processing`; queda fuera de Fase 1.5.
