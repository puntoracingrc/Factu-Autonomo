# Checkpoint de estabilizacion 2B.4 local/staging

Estado:

`APTO PARA CERRAR BLOQUE LOCAL/STAGING 2B.4`

Limitaciones absolutas:

`NO APTO PARA PRODUCCION`

`NO APTO PARA AEAT REAL`

`NO APTO PARA CERTIFICADOS`

`NO APTO PARA TRANSPORTE`

`NO ES VERIFACTU PRODUCTIVO`

## Fases 2B.4 completadas

- 2B.4A: preparacion de dominio local de operacion fiscal.
- 2B.4B/C/D: contrato y RPC transaccional de reserva fiscal.
- 2B.4E: aceptacion local de reserva/idempotencia.
- 2B.4F/G/H/I: transicion a `processing` y dry-run server-only.
- 2B.4J/K/L/M: `fiscal_records` y `fiscal_chain_state` local/staging.
- 2B.4N/O: payload candidato no definitivo.
- 2B.4P/Q: validacion semantica y evidence packet interno.
- 2B.4R/S: persistence de evidence packet en tabla separada.
- 2B.4T: evidence integrity read-only.
- 2B.4U: operational summary agregado y cierre documental.

## Implementado en local/staging

El bloque construye una cadena server-only local/staging:

`server_documents`
-> `fiscal_operations`
-> `fiscal_invoice_identities`
-> `fiscal_records`
-> `fiscal_chain_state`
-> payload candidato
-> validacion semantica
-> evidence packet
-> evidence persistence
-> evidence integrity
-> operational summary

La implementacion permite reservar operaciones, pasarlas a `processing`, crear
registros fiscales candidatos con cadena local, generar material y payload
candidato no final, validar semantica, persistir evidencia interna separada,
leer integridad de esa evidencia y generar resumen operacional agregado.

## Tablas existentes

- `server_documents`
- `server_document_versions`
- `document_conflicts`
- `fiscal_operations`
- `fiscal_invoice_identities`
- `fiscal_records`
- `fiscal_chain_state`
- `fiscal_transport_attempts`
- `fiscal_evidence_packets`

`fiscal_transport_attempts` existe en el schema base, pero este bloque no lo usa
como cola, no inserta intentos y solo lo cuenta para confirmar cero en local.

## Modulos server-only

- `src/lib/fiscal-operations/`
- `src/lib/fiscal-operation-pipeline/`
- `src/lib/fiscal-record-material/`
- `src/lib/fiscal-records/`
- `src/lib/fiscal-chain/`
- `src/lib/fiscal-payload-candidate/`
- `src/lib/fiscal-payload-validation/`
- `src/lib/fiscal-evidence-packet/`
- `src/lib/fiscal-evidence-persistence/`
- `src/lib/fiscal-evidence-integrity/`
- `src/lib/fiscal-evidence-operational-summary/`

Los modulos server-only usan cliente Supabase inyectado cuando acceden a base de
datos. No crean cliente Supabase, no leen secrets y no exponen service role.

## Validaciones dinamicas realizadas

- reserva fiscal local e idempotencia;
- transicion a `processing`;
- dry-run fiscal local;
- persistencia de `fiscal_records`;
- atomicidad de `fiscal_records` con `fiscal_chain_state`;
- payload candidato de alta, alta encadenada y anulacion;
- validacion semantica del payload candidato;
- evidence packet interno sin XML completo;
- evidence persistence en `fiscal_evidence_packets`;
- evidence integrity contra `fiscal_records` y `fiscal_chain_state`;
- operational summary con conteos, ultimo sequence/hash, gaps y cero
  `fiscal_transport_attempts`.

## Resumen por capa

Operacion fiscal:
reserva local/staging con idempotencia y `fiscal_invoice_identities`, sin tocar
numeracion real ni facturas reales.

Processing:
transicion controlada de `requested` a `processing`, sin UI y sin transporte.

`fiscal_records`:
persistencia candidata local/staging con hashes `sha256` candidatos y referencia
a documento canonico, sin XML AEAT definitivo.

`fiscal_chain_state`:
cabecera local por usuario, entorno y emisor para validar encadenado staging.

Payload candidato:
representacion no definitiva y no transportable, marcada como candidato.

Validacion semantica:
checks sobre campos, finality, transportabilidad, firma, certificados y señales
AEAT reales.

Evidence packet:
paquete interno dry-run con digest seguro, sin XML completo y sin snapshot.

Evidence persistence:
tabla separada `fiscal_evidence_packets`, `transportable=false`, metadata segura
y RPC local/staging.

Evidence integrity:
lectura server-only que clasifica `valid`, `missing_record`, `missing_chain`,
`mismatch`, `unsafe_metadata` y `rejected`.

Operational summary:
resumen agregado por `user_id` y `environment` con totales, ultimo hash,
conteos por estado, gaps, flags de metadata y confirmacion de cero transporte.

## Que sigue fuera

- XML AEAT definitivo.
- QR definitivo.
- firma.
- certificados.
- transporte AEAT.
- respuestas AEAT.
- reintentos reales.
- UI.
- produccion.
- revision externa legal/fiscal.

## Riesgos vivos

- La cadena es local/staging y no sustituye normativa ni homologacion.
- La evidencia no es transporte y no debe convertirse en cola.
- Cualquier siguiente bloque con AEAT real necesita diseno, revision y
  autorizacion separada.
- El resumen operacional no debe exponer XML, snapshots, tokens ni secretos.

## Recomendacion de siguiente bloque

Cerrar 2B.4 como base local/staging estabilizada. El siguiente bloque deberia
centrarse en definicion de contratos externos o preparacion documental controlada
antes de cualquier transporte, firma, certificado o integracion AEAT real.
