# Phase 2B.4R/S Fiscal Evidence Local/Staging Persistence v1

`PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1`

## Objetivo

Persistir paquetes de evidencia internos ya construidos y validados en una tabla
separada, solo para Supabase local/staging.

Esta fase no es cumplimiento AEAT real y no habilita VeriFactu productivo.

## Alcance 2B.4R

Se crea la tabla separada:

`fiscal_evidence_packets`

La tabla guarda evidencia interna dry-run vinculada a:

- `fiscal_records`;
- `fiscal_operations`;
- `fiscal_chain_state` como precondicion de consistencia.

No se usa como cola de transporte y no reemplaza la cadena fiscal.

## Alcance 2B.4S

Se anade aceptacion local con Supabase local:

`scripts/test-phase2b4s-fiscal-evidence-local-persistence.mjs`

El flujo crea datos efimeros locales y recorre:

- `fiscal_operations`;
- `fiscal_records`;
- `fiscal_chain_state`;
- payload candidato;
- validacion semantica;
- paquete de evidencia;
- persistencia de evidencia interna.

## Decision De Persistencia Separada

La evidencia se persiste en una tabla propia para mantener una frontera clara:

- no vive dentro de `fiscal_records`;
- no modifica `fiscal_chain_state`;
- no usa `fiscal_transport_attempts`;
- no es un intento de envio.

La tabla es idempotente por `record_id`: si se reintenta la persistencia para el
mismo registro, la RPC devuelve la evidencia existente.

## Campos

`fiscal_evidence_packets` incluye:

- `id`;
- `user_id`;
- `environment`;
- `record_id`;
- `operation_id`;
- `record_sequence`;
- `record_hash`;
- `previous_hash`;
- `payload_candidate_id`;
- `payload_validation_status`;
- `xml_candidate_digest`;
- `evidence_finality`;
- `transportable`;
- `created_at`;
- `metadata_safe`.

`xml_candidate_digest` es solo un hash seguro del XML candidato. No se guarda el
XML candidato completo.

`transportable` queda bloqueado por check a `false`.

`evidence_finality` queda bloqueado a `internal_dry_run_evidence`.

## Datos Que No Se Guardan

La tabla y la RPC rechazan o evitan guardar:

- XML completo;
- XML AEAT definitivo;
- payload documental completo;
- snapshot documental completo;
- snapshot PDF completo;
- tokens;
- service role;
- certificados;
- claves privadas;
- endpoints AEAT;
- metadatos de transporte real.

## RPC

RPC creada:

`create_fiscal_evidence_packet_local_staging`

La RPC:

- usa `security definer`;
- fija `search_path = ''`;
- exige `auth.role() = 'service_role'`;
- carga `fiscal_records` por `user_id + record_id`;
- valida que exista cabecera de cadena;
- valida que la cadena confirme el registro;
- valida payload candidato y finality;
- inserta solo evidencia interna segura;
- devuelve una respuesta sin XML ni snapshots.

## Permisos

La tabla tiene RLS activo y no concede acceso a `public`, `anon` ni
`authenticated`.

La RPC revoca ejecucion a `public`, `anon` y `authenticated`, y concede ejecucion
solo a `service_role`.

## Modulo Server-Only

Modulo creado:

`src/lib/fiscal-evidence-persistence/`

Contiene:

- tipos;
- errores tipados;
- repositorio server-only;
- adapter Supabase;
- tests unitarios.

El modulo recibe el cliente Supabase inyectado. No crea cliente, no lee
variables de entorno y no expone service role.

## Pruebas Supabase Local

Script local:

`scripts/test-phase2b4s-fiscal-evidence-local-persistence.mjs`

Casos cubiertos:

- Supabase local obligatorio;
- primer registro de alta;
- segundo registro encadenado;
- registro de anulacion;
- persistencia de evidencia interna;
- idempotencia por `record_id`;
- rechazo si el payload no es valido;
- `transportable = false`;
- no se guarda XML completo;
- no se guardan snapshots completos;
- no se crea `fiscal_transport_attempts`.

Los datos inmutables locales creados por la prueba quedan en la base local. Para
limpiar completamente, usar reset de Supabase local.

## Tablas Tocadas

Nueva:

- `fiscal_evidence_packets`.

La aceptacion local crea datos de prueba en:

- `server_documents`;
- `fiscal_operations`;
- `fiscal_invoice_identities`;
- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_evidence_packets`.

## Tablas No Tocadas

- `fiscal_transport_attempts`.

## Limites

- No Supabase produccion.
- No staging remoto sin autorizacion.
- No AEAT real.
- No certificados reales.
- No VeriFactu funcional productivo.
- No XML AEAT definitivo.
- No firma.
- No transporte AEAT.
- No `fiscal_transport_attempts`.
- No UI.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No Vercel config.
- No promote.
- No dominios, DNS ni aliases.
- No Stripe, precios, planes, IA ni importadores.

## Riesgos Vivos

- La evidencia persistida sigue siendo interna y no transportable.
- XML definitivo, firma, certificados y transporte siguen sin existir.
- Cualquier uso futuro para transporte debe pasar por una fase separada y nueva
  revision de seguridad.

## Queda Para 2B.4T

- Definir lectura operacional de la evidencia persistida.
- Decidir si hace falta auditoria adicional de integridad sobre la tabla.
- Mantener separada cualquier fase futura de XML definitivo, firma,
  certificados o transporte.
