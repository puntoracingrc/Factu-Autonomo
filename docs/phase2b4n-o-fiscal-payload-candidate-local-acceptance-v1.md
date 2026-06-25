# Phase 2B.4N/O Fiscal Payload Candidate Local Acceptance v1

`PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1`

## Objetivo

Construir un payload fiscal candidato, no definitivo, a partir de registros
fiscales locales/staging ya persistidos y encadenados.

Esta fase no es cumplimiento AEAT real y no habilita VeriFactu productivo.

## Alcance 2B.4N

Se anade el modulo server-only:

`src/lib/fiscal-payload-candidate/`

El modulo construye:

- `payloadCandidateId`;
- `recordId`;
- `operationId`;
- `recordType`;
- `issuerNif`;
- `numserie`;
- `fechaExpedicion`;
- `recordHash`;
- `previousHash`;
- `recordSequence`;
- `environment`;
- `generatedAtCandidate`;
- `formatVersionCandidate`;
- `finality: "candidate_not_aeat"`;
- `transportable: false`.

Tambien genera un texto XML candidato con el marcador:

`PHASE2B4N_O_XML_CANDIDATE_NOT_AEAT_FINAL`

Ese texto no es XML AEAT definitivo, no se firma y no se transporta.

## Alcance 2B.4O

Se anade aceptacion local:

`scripts/test-phase2b4o-fiscal-payload-candidate-local.mjs`

El script exige Supabase local, rechaza hosts no locales, prepara datos
efimeros, crea registros fiscales encadenados con la RPC local/staging de
2B.4M y construye payloads candidatos para:

- primer registro de alta;
- segundo registro encadenado;
- registro de anulacion.

## Decision Sobre XML Candidato

El XML generado es solo una representacion candidata para probar estructura y
contratos internos. Queda marcado como no definitivo y no transportable.

No contiene endpoint AEAT, no usa certificado, no se firma y no se presenta
como cumplimiento real.

## Decision Sobre Persistencia

El payload candidato no se persiste en base de datos en esta fase.

La decision es mantenerlo en memoria y en tests para respetar la inmutabilidad
de `fiscal_records`. Los registros fiscales ya creados no se actualizan para
sustituir el marcador tecnico de fases previas.

## Inmutabilidad De Registros

`fiscal_records` se trata como inmutable. La fase solo lee registros y cadena
para construir un artefacto candidato separado. No hace `insert`, `update`,
`delete` ni `upsert` sobre registros fiscales.

## Tests Unitarios

Los tests cubren:

- payload candidato desde `alta`;
- payload candidato desde `anulacion`;
- `recordHash`;
- `previousHash`;
- `recordSequence`;
- `finality: "candidate_not_aeat"`;
- `transportable: false`;
- falta de `recordHash`;
- falta de `issuerNif`;
- falta de `numserie`;
- falta de `fechaExpedicion`;
- cadena inconsistente;
- ausencia de firma, transporte, certificados y endpoint AEAT.

## Pruebas Con Supabase Local

El script local cubre:

- Supabase local obligatorio;
- primer registro `alta`;
- segundo registro encadenado;
- registro `anulacion`;
- fallo controlado por cadena inconsistente;
- fallo controlado por falta de `recordHash`;
- no se crean `fiscal_transport_attempts`;
- no se imprime XML completo desde el script;
- no se imprimen tokens ni service role.

Los datos inmutables locales creados por la prueba quedan en la base local. Para
limpiar completamente, usar reset de Supabase local.

## Tablas Tocadas

Ninguna tabla nueva.

La aceptacion local reutiliza el flujo previo para crear datos de prueba en:

- `server_documents`;
- `fiscal_operations`;
- `fiscal_invoice_identities`;
- `fiscal_records`;
- `fiscal_chain_state`.

## Tablas No Tocadas

- `fiscal_transport_attempts`.

## Limites

- No XML AEAT definitivo.
- No QR definitivo.
- No firma.
- No certificados.
- No transporte.
- No UI ni formularios reales.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.

## Riesgos Vivos

- La semantica productiva del XML queda fuera.
- El payload candidato todavia no tiene persistencia separada.
- La firma, el transporte y la respuesta AEAT real siguen sin existir.

## Queda Para 2B.4P

- Decidir si el payload candidato merece persistencia separada.
- Definir validacion semantica mas estricta antes de cualquier XML definitivo.
- Mantener frontera clara antes de firma, certificado o transporte real.

## Comandos Ejecutados

- `npm run validate:phase2b4n-o-fiscal-payload-candidate`
- `npm run test:phase2b4o-fiscal-payload-candidate-local`
- tests unitarios del modulo
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
