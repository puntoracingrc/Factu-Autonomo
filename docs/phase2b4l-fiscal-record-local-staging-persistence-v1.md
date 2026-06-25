# Phase 2B.4L Fiscal Record Local/Staging Persistence v1

`PHASE2B4L_FISCAL_RECORD_LOCAL_STAGING_PERSISTENCE_V1`

## Objetivo

Preparar la primera persistencia local/staging de registros fiscales candidatos
en `fiscal_records`, usando los contratos 2B.4J/2B.4K ya existentes.

Esta fase no es cumplimiento AEAT real y no habilita VeriFactu productivo.

## Decision

Decision: A.

2B.4L persiste solo `fiscal_records`.

No actualiza `fiscal_chain_state`. La actualizacion atomica de cadena queda para
2B.4M, porque esa fase debe cerrar concurrencia, cabecera de cadena y estado
persistido en una unica transaccion formal.

## Alcance

- RPC local/staging `public.create_fiscal_record_local_staging`.
- Adapter server-only `SupabaseFiscalRecordLocalStagingStore`.
- Repositorio server-only `FiscalRecordLocalStagingRepository`.
- Construccion previa de material dry-run 2B.4G.
- Construccion de candidato de registro 2B.4J.
- Construccion de hash/cadena candidata 2B.4K.
- Insercion de registro fiscal candidato en `fiscal_records`.
- Revalidacion de cabecera previa antes de insertar.
- Respuesta segura sin `xml_payload`, snapshots ni payload documental.

## Migracion

Archivo:

`supabase/migrations/20260625133500_phase2b4l_fiscal_record_local_persistence.sql`

La migracion:

- ajusta el check de `record_type` para permitir candidatos `alta` y
  `anulacion`;
- crea `public.create_fiscal_record_local_staging`;
- usa `security definer`;
- fija `search_path = ''`;
- exige `auth.role() = 'service_role'`;
- revoca ejecucion a `public`, `anon` y `authenticated`;
- concede ejecucion solo a `service_role`;
- carga operacion por `user_id + operation_id`;
- exige estado `processing`;
- valida identidad fiscal;
- inserta en `fiscal_records`;
- no toca `fiscal_chain_state`;
- no crea `fiscal_transport_attempts`.

## Rollback

Archivo:

`supabase/rollbacks/20260625133500_phase2b4l_fiscal_record_local_persistence.down.sql`

El rollback elimina la RPC y restaura el check previo de `record_type`.

Como `fiscal_records` es inmutable, si ya existen registros candidatos con
`record_type = 'alta'`, el rollback manual debe hacerse sobre una base local
reseteada o sin esos registros.

## Permisos

- `anon`: no ejecuta la RPC.
- `authenticated`: no ejecuta la RPC.
- `service_role`: ejecuta la RPC en local/staging.

El codigo TypeScript no crea cliente Supabase, no lee secrets y espera recibir
un cliente inyectado por la capa servidor.

## Tablas Tocadas

- `fiscal_records`: insercion local/staging de registros candidatos.

## Tablas No Tocadas

- `fiscal_chain_state`: no se inserta, actualiza ni borra.
- `fiscal_transport_attempts`: no se inserta, actualiza ni borra.
- `server_documents`: no se modifica.
- `fiscal_operations`: no se modifica en esta fase.
- `fiscal_invoice_identities`: no se modifica en esta fase.

## XML

La tabla original exige `xml_payload`. 2B.4L no genera XML AEAT definitivo.

Para mantener compatibilidad local/staging sin generar XML real, la RPC inserta
el marcador tecnico:

`PHASE2B4L_NO_AEAT_XML_CANDIDATE`

Ese valor no se devuelve desde la RPC ni desde el adapter.

## Tests

- Unitarios del repositorio server-only.
- Unitarios del adapter RPC.
- Script local Supabase:
  `scripts/test-phase2b4l-fiscal-record-local-persistence.mjs`.

Casos cubiertos:

- operacion `processing` crea registro local;
- operacion no `processing` rechaza;
- operacion de otro usuario rechaza;
- registro se crea con `operation_id`;
- registro se vincula a `invoice_identity_id`;
- candidato `alta`;
- candidato `anulacion`;
- no se crean `fiscal_transport_attempts`;
- no se actualiza `fiscal_chain_state`;
- no hay XML AEAT definitivo;
- `anon` no ejecuta;
- `authenticated` no ejecuta;
- `service_role` local ejecuta.

## Riesgos Vivos

- La cabecera de cadena formal no se persiste en `fiscal_chain_state`.
- La limpieza de registros locales requiere reset de Supabase local porque
  `fiscal_records` es inmutable.
- La cadena productiva, XML definitivo, QR definitivo y transporte AEAT quedan
  fuera.

## Queda Para 2B.4M

- Persistir `fiscal_records` y actualizar `fiscal_chain_state` en la misma
  transaccion.
- Pruebas de concurrencia especificas de cabecera de cadena.
- Cerrar semantica final de secuencia/cadena antes de cualquier produccion.

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
