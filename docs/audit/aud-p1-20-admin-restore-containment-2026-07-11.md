# Contención AUD-P1-20 — restauración administrativa fail-closed

Fecha: 2026-07-11.

**Estado:** contención en validación local desde `origin/main`
(`cc83d1b28e0765f90c73a1d8655621f4ac25cd9f`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Riesgo confirmado

El apply anterior no era una operación indivisible. Creaba primero una copia de
seguridad, aplicaba `sync_entities` en bloques de 500 y registraba el evento al
final. Un fallo intermedio podía dejar una mezcla de datos antiguos y nuevos o
datos ya mutados sin evento coherente. Tampoco existían idempotencia, CAS ligado
a la vista previa ni protección específica contra reemplazar o borrar un
documento emitido válido.

La ruta dependía además de la flag MFA global. Con ella desactivada, una cuenta
admin en AAL1 podía llegar al flujo. La vista previa era agregada, no tenía
digest/versionado y podía quedar obsoleta antes del apply.

## Decisión de contención

AUD-P1-20 se cierra por contención, no por habilitar una restauración
transaccional:

- todo el endpoint de copias admin exige AAL2 aunque `ADMIN_MFA_REQUIRED` esté
  desactivado;
- crear una copia privada y calcular su vista previa siguen disponibles;
- las respuestas clasifican los puntos como `mode: "preview_only"`;
- la UI no contiene email de confirmación, handler ni botón para aplicar;
- un POST directo con `action: "restore"` devuelve 503,
  `admin_restore_transaction_required` y `Cache-Control: no-store`;
- ese bloqueo ocurre antes de consultar al usuario objetivo, leer
  `sync_entities`, crear una copia de seguridad, hacer upserts o insertar un
  evento;
- no existe flag que reactive el apply: hace falta otro cambio de código
  revisado.

La lectura de workspaces grandes usa keyset por la clave inmutable
`entity_type + entity_id`, sin offset ni `updated_at` mutable. La regresión de
501 filas cambia `updated_at` entre páginas y conserva las 501 entidades sin
duplicar ni omitir.

## Integridad preservada

La contención impide que el service role pueda reescribir o tombstonear por
restore facturas emitidas, snapshots, sellos, PDFs congelados o procedencia
histórica. No se modifica emisión, rectificación, recibos, fiscalidad, cadena
VeriFactu, huellas ni transporte AEAT.

Se mantienen los cierres previos:

- AUD-P1-01/02/03/04: periodos, derivados, rectificativas y reparación de
  emitidos siguen bajo sus pipelines canónicos;
- AUD-P1-05/06/07/13: cálculo fiscal, deducibilidad, IVA mixto y abonos no se
  tocan;
- AUD-P1-08/15/16/17: los claims y la remisión VeriFactu permanecen
  fail-closed;
- el contrato Phase 2D de import/restore continúa `NO APPLY` para documentos
  protegidos.

## Reactivación funcional diferida

Aplicar una copia queda diferido a otro PR y requiere, como mínimo:

1. punto nuevo creado de forma transaccional y versionado con digest;
2. preview persistida y CAS contra el estado exacto del workspace;
3. AAL2, idempotencia y serialización por usuario;
4. una RPC única para copia de seguridad, cambios y evento, o una saga
   reanudable con rollback probado;
5. rechazo de cualquier cambio sobre documentos protegidos mediante los
   inspectores canónicos de snapshots, sellos y relaciones;
6. pruebas locales de concurrencia y de fallo antes/después de cada paso.

Los puntos históricos y los creados por esta contención son solo de vista
previa; no deben reutilizarse como input aplicable sin esa nueva validación.

## Límites y hallazgos diferidos

- AUD-P1-09 sigue aparcado hasta disponer de acceso al proyecto Vercel heredado.
- AUD-P1-19/Stripe sigue aparcado hasta disponer de acceso y coordinación
  expresa.
- AUD-P2-22, preferencias locales de Rentabilidad Real fuera del backup cloud,
  sigue diferido y no se mezcla en este bloque.
- No hay migraciones ni cambios de esquema. No se toca Supabase remoto, Stripe,
  dominio, secretos ni datos reales.

## Evidencia local

- regresiones dirigidas de restore, AAL2, API, UI, paginado, almacenamiento e
  integridad: 180 aprobadas;
- suite completa: 447 archivos aprobados y 11 omitidos; 2.960 pruebas aprobadas
  y 17 omitidas;
- batería específica de integridad documental, snapshots, rectificativas,
  fiscalidad y VeriFactu: 84 archivos, 678 pruebas aprobadas y 6 omitidas;
- manual: 15 pruebas aprobadas;
- TypeScript, ESLint completo y `git diff --check`: correctos;
- convenciones de 25 migraciones/16 rollbacks y 403 fixtures sintéticos:
  correctos, sin datos privados;
- build de producción: correcto, 103 páginas.

Quedan pendientes para el cierre del bloque el PR, sus checks remotos, el merge
a `main` y la verificación de producción sobre el commit fusionado.
