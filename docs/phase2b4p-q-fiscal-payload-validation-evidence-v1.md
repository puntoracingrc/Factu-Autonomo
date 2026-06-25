# Phase 2B.4P/Q Fiscal Payload Validation Evidence v1

`PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1`

## Objetivo

Reforzar el payload fiscal candidato antes de cualquier paso futuro hacia XML
definitivo, firma, certificados o transporte.

Esta fase no es cumplimiento AEAT real y no habilita VeriFactu productivo.

## Alcance 2B.4P

Se anade el modulo server-only:

`src/lib/fiscal-payload-validation/`

El modulo valida semanticamente un payload candidato:

- identidad fiscal minima;
- `recordId`, `operationId`, `recordType`, `recordHash` y secuencia;
- `previousHash` obligatorio para secuencias mayores que 1;
- hashes normalizados;
- `finality: "candidate_not_aeat"`;
- `transportable: false`;
- ausencia de firma, certificados, endpoint AEAT, transporte real, secretos,
  tokens y snapshots completos.

El resultado puede ser:

- `valid`;
- `rejected`;
- lista de errores tipados;
- lista de warnings.

## Alcance 2B.4Q

Se anade el modulo server-only:

`src/lib/fiscal-evidence-packet/`

El modulo construye un paquete de evidencia interno, en memoria, a partir de:

- registro fiscal candidato;
- estado de cadena;
- payload candidato;
- resultado de validacion semantica.

El paquete incluye:

- `evidencePacketId`;
- `recordId`;
- `operationId`;
- `recordSequence`;
- `recordHash`;
- `previousHash`;
- `payloadCandidateId`;
- `payloadValidationStatus`;
- `generatedAt`;
- `environment`;
- `finality: "internal_dry_run_evidence"`;
- `transportable: false`;
- digest del XML candidato, no el XML completo.

## Decision De No Persistencia

La evidencia no se persiste en base de datos en esta fase.

La decision es mantener el paquete en memoria y tests para evitar introducir
persistencia prematura. No se crea tabla nueva y no se escriben
`fiscal_transport_attempts`.

## Tests Unitarios

Los tests de validacion cubren:

- payload candidato valido;
- alta valida;
- anulacion valida;
- falta de `recordHash`;
- falta de `previousHash` en secuencia mayor que 1;
- `transportable: true`;
- `finality` incorrecta;
- firma detectada;
- certificado detectado;
- endpoint AEAT detectado;
- XML definitivo o no marcado;
- errores tipados estables.

Los tests de evidencia cubren:

- paquete de evidencia valido;
- rechazo si el payload no esta validado;
- rechazo si el payload es invalido;
- `transportable: false`;
- ausencia de XML completo;
- ausencia de snapshot completo;
- ausencia de tokens, service role, secretos y transporte;
- errores tipados estables.

## Pruebas Con Supabase Local

Script local:

`scripts/test-phase2b4q-fiscal-evidence-packet-local.mjs`

Casos:

- Supabase local obligatorio;
- primer registro de alta;
- segundo registro encadenado;
- registro de anulacion;
- payload candidato;
- validacion semantica;
- paquete de evidencia;
- rechazo por payload invalido;
- no se imprimen tokens ni service role;
- no se imprime XML completo;
- no se crea `fiscal_transport_attempts`;
- no se conecta AEAT;
- no se usan certificados.

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
- No firma.
- No certificados.
- No transporte.
- No UI ni formularios reales.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No persistencia de evidencia.

## Riesgos Vivos

- La evidencia aun no tiene almacenamiento propio.
- La semantica productiva de XML sigue fuera.
- Firma, certificado, transporte y respuesta AEAT real siguen sin existir.

## Queda Para 2B.4R

- Decidir si la evidencia interna debe persistirse en una tabla separada.
- Definir ciclo de vida de evidencia antes de cualquier XML definitivo.
- Mantener frontera clara antes de firma, certificado o transporte real.

## Comandos Ejecutados

- `npm run validate:phase2b4p-q-fiscal-payload-validation-evidence`
- `npm run test:phase2b4q-fiscal-evidence-packet-local`
- tests unitarios de validacion y evidencia
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
