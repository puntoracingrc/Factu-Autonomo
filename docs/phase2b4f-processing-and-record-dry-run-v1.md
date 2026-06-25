# Fase 2B.4F + 2B.4G - Processing y material fiscal dry-run

Estado: IMPLEMENTACION LOCAL/STAGING PREPARADA / SIN PRODUCCION.

Este documento es evidencia tecnica interna. No constituye certificacion legal,
fiscal ni tributaria. No declara homologacion AEAT, remision VERI*FACTU
productiva ni cumplimiento completo. Cualquier paso de produccion queda
pendiente de validacion externa cuando aplique.

## 1. Objetivo

La fase encadena dos piezas pequenas dentro del flujo servidor:

- Fase 2B.4F: transicion atomica de una operacion fiscal desde `requested` a
  `processing`.
- Fase 2B.4G: builder server-only de material fiscal preliminar, en modo
  dry-run, desde una operacion ya en `processing`.

No se abren registros fiscales finales. No se crea cadena fiscal. No se genera
XML AEAT definitivo. No existe transporte AEAT.

## 2. Alcance 2B.4F

Se anade la RPC local/staging:

- `public.mark_fiscal_operation_processing(p_user_id, p_operation_id, p_marked_at)`.

La RPC:

- exige `auth.role() = 'service_role'`;
- usa `SECURITY DEFINER`;
- fija `search_path = ''`;
- bloquea la fila de `public.fiscal_operations` con `for update`;
- acepta solo operaciones del `user_id` indicado;
- permite la transicion `requested -> processing`;
- devuelve `existing_processing` si la operacion ya estaba en `processing`;
- rechaza operaciones inexistentes, de otro usuario o en estado incompatible;
- no crea `fiscal_records`;
- no actualiza `fiscal_chain_state`;
- no crea `fiscal_transport_attempts`.

Resultados controlados:

- `processing`;
- `existing_processing`;
- `rejected`;
- `conflict`.

## 3. Migracion y rollback

Migracion:

- `supabase/migrations/20260625093000_phase2b4f_fiscal_operation_processing_rpc.sql`

Rollback manual:

- `supabase/rollbacks/20260625093000_phase2b4f_fiscal_operation_processing_rpc.down.sql`

El rollback elimina solo la RPC `mark_fiscal_operation_processing`. No toca
tablas ni datos.

## 4. Permisos

La RPC revoca ejecucion a:

- `public`;
- `anon`;
- `authenticated`.

La RPC concede ejecucion solo a:

- `service_role`.

Ademas, la propia funcion valida en tiempo de ejecucion que el rol efectivo sea
`service_role`.

## 5. Alcance 2B.4G

Se anade el modulo puro:

- `src/lib/fiscal-record-material/`

El builder:

- se llama `buildFiscalRecordMaterialDryRun`;
- requiere una operacion en `processing`;
- requiere identidad fiscal reservada;
- requiere `documentSnapshotHash`;
- requiere `issuerNif`;
- requiere `numserie`;
- requiere `fechaExpedicion`;
- prepara campos candidatos:
  - `operationId`;
  - `invoiceIdentityId`;
  - `serverDocumentId`;
  - `operationType`;
  - `recordTypeCandidate`;
  - `issuerNif`;
  - `numserie`;
  - `fechaExpedicion`;
  - `documentSnapshotHash`;
  - `pdfContentHash`;
  - `schemaVersionCandidate`;
  - `hashInputCandidate`;
  - `createdAtCandidate`.

El builder marca explicitamente:

- `dryRun: true`;
- `finality: preliminary_not_aeat`;
- `schemaVersionCandidate: phase2b4g-dry-run-v1`.

## 6. Que queda fuera

No se implementa:

- `fiscal_records` funcional;
- escritura en `fiscal_records`;
- actualizacion de `fiscal_chain_state`;
- escritura en `fiscal_transport_attempts`;
- XML AEAT definitivo;
- hash fiscal definitivo;
- cadena fiscal real;
- transporte AEAT;
- certificados reales;
- endpoints AEAT reales;
- UI;
- conexion con formularios reales;
- cambios de numeracion;
- cambios de facturas reales;
- cambios de PDFs historicos;
- Supabase produccion;
- staging remoto sin autorizacion expresa;
- Vercel config;
- Stripe, precios, planes, IA o importadores.

## 7. Validadores

Se anaden:

- `npm run validate:phase2b4f-fiscal-operation-processing`
- `npm run validate:phase2b4g-fiscal-record-material-dry-run`

Estos validadores revisan:

- presencia de migracion y rollback;
- `SECURITY DEFINER`;
- `search_path` seguro;
- guardia `service_role`;
- `GRANT/REVOKE` de ejecucion;
- ausencia de grants peligrosos;
- ausencia de escrituras a tablas fiscales finales;
- ausencia de AEAT real, certificados, XML definitivo o transporte;
- ausencia de service role expuesto al cliente;
- ausencia de Stripe, IA e importadores.

## 8. Pruebas locales

Script local:

- `npm run test:phase2b4f-fiscal-processing-local`

Casos:

- `requested -> processing`;
- repetir transicion devuelve `existing_processing`;
- operacion inexistente o de otro usuario queda rechazada;
- estado incompatible queda rechazado;
- dos llamadas simultaneas quedan controladas como `processing` +
  `existing_processing`;
- `anon` no ejecuta;
- `authenticated` no ejecuta;
- `service_role` local ejecuta;
- no se escriben `fiscal_records`;
- no se actualiza `fiscal_chain_state`;
- no se crean `fiscal_transport_attempts`;
- rollback local elimina la RPC;
- reaplicar migracion restaura la RPC.

Tests unitarios:

- `src/lib/fiscal-operations/supabase-processing-store.test.ts`
- `src/lib/fiscal-record-material/material-builder.test.ts`

## 9. Riesgos vivos

- Falta crear `fiscal_records` inmutables en una fase posterior.
- Falta cadena fiscal transaccional.
- Falta XML AEAT definitivo.
- Falta transporte AEAT y tratamiento de reintentos.
- Falta politica de staging remoto autorizada antes de cualquier produccion.
- Falta revision externa legal/fiscal cuando aplique.
- El builder dry-run no debe confundirse con registro fiscal valido.

## 10. Siguiente paso

Fase 2B.4H debera decidir si se avanza hacia registro fiscal inmutable real o
si se inserta una fase intermedia adicional de simulacion end-to-end. En ambos
casos debe mantenerse fuera:

- Supabase produccion;
- AEAT real;
- certificados reales;
- XML definitivo;
- transporte;
- datos reales;
- UI productiva.
