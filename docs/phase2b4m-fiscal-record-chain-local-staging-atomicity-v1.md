# Phase 2B.4M Fiscal Record Chain Local/Staging Atomicity v1

`PHASE2B4M_FISCAL_RECORD_CHAIN_LOCAL_STAGING_ATOMICITY_V1`

## Objetivo

Persistir en local/staging un registro fiscal candidato y actualizar la
cabecera de cadena en `fiscal_chain_state` en la misma transaccion
PostgreSQL.

Esta fase no es cumplimiento AEAT real y no habilita VeriFactu productivo.

## Decision De Diseno

Se crea una RPC nueva:

`public.create_fiscal_record_with_chain_local_staging`

No reemplaza la RPC 2B.4L. 2B.4L queda como paso anterior de persistencia de
solo `fiscal_records`; 2B.4M define el flujo final local/staging donde
`fiscal_records` y `fiscal_chain_state` avanzan juntos.

## Atomicidad

La atomicidad vive dentro de PostgreSQL:

1. La RPC carga la operacion por `user_id + operation_id`.
2. Bloquea la operacion con `for update`.
3. Crea si falta la fila de `fiscal_chain_state` para
   `user_id + environment + issuer_nif`.
4. Bloquea esa fila con `for update`.
5. Comprueba que la cabecera coincide con la esperada por el repositorio.
6. Inserta `fiscal_records`.
7. Actualiza `fiscal_chain_state.last_record_id`, `last_hash` y `record_count`
   en la misma transaccion.

Si la cabecera cambia entre la lectura del repositorio y el bloqueo de la RPC,
la RPC devuelve `record_chain_head_changed`; el repositorio server-only
relee la cabecera, recalcula el hash candidato y reintenta.

## Bloqueo De Cadena

La fila bloqueada es:

- `user_id`
- `environment`
- `issuer_nif`

Eso serializa las escrituras de un mismo emisor fiscal en un mismo entorno.

## Secuencia

`record_sequence` se calcula dentro de la RPC como:

`fiscal_chain_state.record_count + 1`

La RPC actualiza despues:

- `last_record_id = nuevo fiscal_records.id`
- `last_hash = nuevo fiscal_records.record_hash`
- `record_count = nuevo fiscal_records.record_sequence`

## Previous Hash

El repositorio calcula el candidato de hash con los contratos 2B.4K usando la
cabecera que acaba de leer.

La RPC no confia ciegamente en esa lectura: compara
`p_expected_previous_record_id` y `p_expected_previous_hash` contra la fila
bloqueada de `fiscal_chain_state`. Si no coinciden, no inserta registro y
devuelve conflicto.

## Migracion

Archivo:

`supabase/migrations/20260625142000_phase2b4m_fiscal_record_chain_atomicity.sql`

La migracion:

- crea `public.create_fiscal_record_with_chain_local_staging`;
- usa `security definer`;
- fija `search_path = ''`;
- exige `auth.role() = 'service_role'`;
- revoca ejecucion a `public`, `anon` y `authenticated`;
- concede ejecucion solo a `service_role`;
- inserta en `fiscal_records`;
- actualiza `fiscal_chain_state`;
- no toca `fiscal_transport_attempts`.

## Rollback

Archivo:

`supabase/rollbacks/20260625142000_phase2b4m_fiscal_record_chain_atomicity.down.sql`

El rollback elimina solo la RPC atomica. No borra registros ni cadena, porque
son datos inmutables/locales de prueba.

## Tests Locales

Script:

`scripts/test-phase2b4m-fiscal-record-chain-local.mjs`

Casos:

- `anon` no ejecuta;
- `authenticated` no ejecuta;
- `service_role` local ejecuta;
- operacion no `processing` rechaza;
- operacion de otro usuario rechaza;
- primer registro crea `fiscal_records` y `fiscal_chain_state`;
- `record_sequence = 1`;
- primer registro no tiene previous hash;
- segundo registro encadena contra el primero;
- repeticion de la misma operacion devuelve `existing`;
- cabecera obsoleta devuelve `record_chain_head_changed`;
- dos operaciones simultaneas mismo emisor/entorno terminan con secuencias
  distintas y cadena consistente;
- no se crea `fiscal_transport_attempts`;
- no hay XML AEAT definitivo;
- rollback local de la RPC probado.

## Tablas Tocadas

- `fiscal_records`: insercion local/staging de registros candidatos.
- `fiscal_chain_state`: creacion/actualizacion atomica de cabecera.

## Tablas No Tocadas

- `fiscal_transport_attempts`.
- `server_documents`.
- `fiscal_operations`.
- `fiscal_invoice_identities`.

## Limites

- `xml_payload` sigue recibiendo un marcador tecnico:
  `PHASE2B4M_NO_AEAT_XML_CANDIDATE`.
- No hay XML AEAT definitivo.
- No hay QR definitivo.
- No hay transporte.
- No hay certificados.
- No hay integracion UI.

## Riesgos Vivos

- La semantica productiva de XML/QR/transporte queda fuera.
- Los registros locales son inmutables; limpiar pruebas requiere reset local.
- Esta fase no debe interpretarse como cumplimiento AEAT productivo.

## Queda Para 2B.4N

- Separar generacion XML candidata/no definitiva de transporte.
- Definir el siguiente borde seguro antes de cualquier certificado o AEAT real.
- Mantener pruebas de concurrencia al conectar fases posteriores.

## Comandos Ejecutados

- `npm run validate:phase2b4m-fiscal-record-chain-atomicity`
- `npm run test:phase2b4m-fiscal-record-chain-local`
- bateria completa de validadores 2B
- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Confirmaciones

- No Supabase produccion.
- No staging remoto.
- No AEAT real.
- No certificados reales.
- No VeriFactu funcional productivo.
- No XML AEAT definitivo.
- No transporte AEAT.
- No `fiscal_transport_attempts`.
- No UI ni formularios reales.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No Vercel config.
- No promote.
- No dominios, DNS ni aliases.
- No Stripe, precios, planes, IA ni importadores.
