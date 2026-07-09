# Runbook de migraciones Supabase produccion

Ultima revision: 2026-07-09.

Objetivo: aplicar cambios de base de datos sin saltarse Git, CI ni verificaciones
de produccion.

## Regla base

No ejecutar SQL en produccion si no cumple todo esto:

- La migracion existe en `supabase/migrations`.
- El cambio esta en una rama y PR.
- CI esta verde: quality, Supabase acceptance y build.
- La migracion es transaccional cuando sea posible.
- Hay plan de verificacion post-ejecucion.
- Hay plan de rollback o mitigacion.

## Antes de ejecutar

1. Confirmar que el PR esta mergeado a `main`.
2. Confirmar que el workflow de `main` paso completo.
3. Confirmar que Vercel Production Domain apunta al ultimo deploy.
4. Leer la migracion completa.
5. Comprobar si referencia tablas historicas que podrian no existir en
   produccion.
6. Preferir migraciones idempotentes o tolerantes a estado existente:
   `if exists`, `if not exists`, `to_regclass`, `drop policy if exists`.
7. Preparar una consulta de verificacion de solo lectura.

## Durante la ejecucion manual

1. Abrir SQL Editor del proyecto correcto.
2. Confirmar proyecto: `rnbmkkzptxbvtchluqrx`, `main`, `Production`.
3. Limpiar el editor antes de pegar SQL nuevo.
4. Pegar la migracion completa desde el archivo versionado.
5. Verificar visualmente inicio y final de la migracion.
6. Ejecutar el script completo, no solo la sentencia activa.
7. Si falla una transaccion, asumir que no se aplico nada a medias y corregir en
   Git antes de reintentar.

## Despues de ejecutar

1. Ejecutar consulta de verificacion.
2. Confirmar que la web responde `200`.
3. Confirmar headers criticos en produccion.
4. Revisar Security Advisor y Performance Advisor.
5. Registrar resultado en el informe/checklist operativo.

## Automatizacion futura

El flujo ideal es un workflow manual protegido en GitHub:

- `workflow_dispatch`.
- Environment protegido `production-database`.
- Requiere aprobacion humana.
- Ejecuta primero dry-run.
- Aplica solo si el operador confirma.
- Ejecuta consultas post-check.

No activarlo hasta tener secretos revisados y una prueba completa en entorno no
productivo.
