# PHASE2B4T_FISCAL_EVIDENCE_READ_INTEGRITY_V1

## Objetivo

Crear una capa server-only de lectura operacional e integridad local/staging para
`fiscal_evidence_packets`.

La fase comprueba que la evidencia persistida coincide con `fiscal_records` y
que la cabecera `fiscal_chain_state` existe y cubre el registro fiscal auditado.
No conecta con AEAT, no firma, no transporta y no genera XML definitivo.

## Alcance

Incluido:

- lectura por `user_id`;
- filtro opcional por `record_id`;
- filtro opcional por `operation_id`;
- filtro opcional por `environment`;
- verificacion de campos persistidos de evidencia contra `fiscal_records`;
- verificacion de existencia y cobertura de `fiscal_chain_state`;
- respuesta segura sin XML completo, snapshots, tokens, service role ni secretos.

Excluido:

- transporte AEAT;
- firma;
- certificados;
- XML AEAT definitivo;
- UI;
- facturas reales;
- numeracion real;
- PDFs historicos;
- `fiscal_transport_attempts` como cola o mecanismo de lectura operacional.

## Diseno de lectura

El modulo `src/lib/fiscal-evidence-integrity/` expone:

- `FiscalEvidenceIntegrityChecker`;
- `SupabaseFiscalEvidenceIntegrityStore`;
- tipos estables para entradas, resultados, checks y mismatches.

El cliente Supabase se inyecta desde fuera. El modulo no crea clientes, no lee
variables de entorno y no accede a secrets.

La lectura usa solo columnas minimas:

- de `fiscal_evidence_packets`: identificadores, hash, secuencia, estado de
  validacion, digest XML candidato, finality, transportable y metadata segura;
- de `fiscal_records`: identificadores, entorno, emisor, secuencia y hashes;
- de `fiscal_chain_state`: emisor, entorno, ultimo registro/hash y contador.

## Diseno de integridad

Cada paquete persistido pasa por estas comprobaciones:

- existe `fiscal_evidence_packets`;
- existe `fiscal_records`;
- existe `fiscal_chain_state`;
- `record_id` coincide;
- `operation_id` coincide;
- `record_sequence` coincide;
- `record_hash` coincide;
- `previous_hash` coincide;
- `payload_validation_status` es `valid`;
- `transportable=false`;
- `evidence_finality=internal_dry_run_evidence`;
- `xml_candidate_digest` existe y tiene formato `sha256:<hex>`;
- no se devuelve XML completo;
- no se devuelve snapshot completo;
- no se devuelve metadata de transporte real;
- la cadena cubre la secuencia auditada;
- si el registro auditado es la cabecera actual, `last_record_id` y `last_hash`
  coinciden.

## Resultados posibles

- `valid`: evidencia, registro y cadena son consistentes.
- `missing_record`: hay evidencia, pero no aparece el registro fiscal asociado.
- `missing_chain`: hay evidencia y registro, pero no cabecera de cadena.
- `mismatch`: hay diferencias entre evidencia, registro o cadena.
- `unsafe_metadata`: la metadata contiene marcadores inseguros o flags no seguros.
- `rejected`: la evidencia no pasa controles basicos como `transportable=false`,
  finality interna o digest XML candidato.

## Pruebas con Supabase local

Script:

`npm run test:phase2b4t-fiscal-evidence-read-integrity-local`

Casos cubiertos:

- evidencia valida para alta;
- evidencia valida para segundo registro encadenado;
- evidencia valida para anulacion;
- mismatch controlado de `record_hash`;
- mismatch controlado de `previous_hash`;
- ausencia controlada de registro;
- ausencia controlada de cadena;
- metadata insegura rechazada;
- `transportable=true` rechazado mediante simulacion de lectura;
- no se crea `fiscal_transport_attempts`;
- respuesta segura sin XML, snapshots, tokens, service role ni secretos.

El script exige Supabase local y rechaza hosts que no sean `localhost`,
`127.0.0.1` o `::1`.

## Tablas leidas

- `fiscal_evidence_packets`;
- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts` solo para contar cero intentos en la aceptacion
  local.

## Tablas tocadas

La fase 2B.4T no crea migraciones nuevas.

Durante la aceptacion local se crean datos efimeros por el flujo previo:

- `server_documents`;
- `fiscal_operations`;
- `fiscal_invoice_identities`;
- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_evidence_packets`.

## Tablas no tocadas

- No se inserta en `fiscal_transport_attempts`.
- No se actualiza `fiscal_transport_attempts`.
- No se elimina de `fiscal_transport_attempts`.
- No se modifica `fiscal_records` desde el modulo 2B.4T.
- No se modifica `fiscal_chain_state` desde el modulo 2B.4T.

## Limites

- Esta capa no demuestra cumplimiento AEAT real.
- Esta capa no reconstruye XML ni firma.
- Para registros historicos no cabecera, `fiscal_chain_state` solo confirma que
  la cadena actual cubre la secuencia. La coincidencia fina de hash se valida
  contra `fiscal_records`.
- Los casos de registro/cadena ausente se simulan en lectura para no romper las
  restricciones locales de integridad referencial.

## Riesgos vivos

- El modelo de evidencia sigue siendo local/staging.
- Si en una fase futura se anaden vistas o RPC de lectura, deben seguir siendo
  read-only y server-only.
- Cualquier uso de evidencia como transporte requiere una fase nueva y separada.

## Que queda para 2B.4U

- Definir consultas operacionales agregadas si hacen falta.
- Decidir si se necesita una vista read-only local/staging.
- Ampliar reportes internos sin exponer material documental completo.
- Mantener separado cualquier diseno de transporte.

## Confirmaciones

- No Supabase produccion.
- No staging remoto.
- No AEAT real.
- No certificados reales.
- No VeriFactu productivo.
- No XML AEAT definitivo.
- No firma.
- No transporte AEAT.
- No `fiscal_transport_attempts` como transporte o cola.
- No UI.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No Vercel config.
- No promote.
- No dominios, DNS ni aliases.
- No Stripe, precios ni planes.
- No IA.
- No importadores.
- No XML completo impreso.
- No secrets impresos.
