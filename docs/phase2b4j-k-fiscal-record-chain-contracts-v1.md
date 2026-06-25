# Phase 2B.4J/K Fiscal Record And Chain Contracts v1

`PHASE2B4J_K_FISCAL_RECORD_AND_CHAIN_CONTRACTS_V1`

## Objetivo

Preparar contratos server-only para el futuro registro fiscal inmutable y la
futura cadena/hash fiscal. Esta fase no persiste registros fiscales finales y
no actualiza estado de cadena.

## Alcance 2B.4J

Modulo: `src/lib/fiscal-records/`

Implementa:

- tipos de registro fiscal candidato;
- errores tipados;
- `buildFiscalRecordCandidate(...)`;
- `buildFiscalRecordCandidateResult(...)`;
- hash input candidato para una fase posterior.

Reglas principales:

- requiere operacion fiscal en `processing`;
- requiere identidad fiscal;
- requiere `operationId`, `invoiceIdentityId`, `serverDocumentId`;
- requiere `issuerNif`, `numserie`, `fechaExpedicion`;
- requiere `documentSnapshotHash`;
- mapea `alta_inicial` y `alta_subsanacion` a candidato `alta`;
- mapea `anulacion` a candidato `anulacion`;
- marca el resultado como `candidate_not_aeat`.

## Alcance 2B.4K

Modulo: `src/lib/fiscal-chain/`

Implementa:

- tipos de cadena/hash candidato;
- errores tipados;
- `buildFiscalHashInputCandidate(...)`;
- `buildFiscalChainLinkCandidate(...)`;
- `assertPreviousHashConsistency(...)`;
- `normalizeFiscalHashAlgorithmCandidate(...)`;
- `buildFiscalChainStateCandidate(...)`.

Reglas principales:

- acepta primer registro sin `previousHash`;
- si hay `previousRecordId`, exige `previousHash`;
- exige `previousHash` normalizado;
- incluye `issuerNif`, `environment`, `recordTypeCandidate`, `numserie`,
  `fechaExpedicion`, `operationId`, `documentSnapshotHash` y
  `recordTimestampCandidate`;
- devuelve input canonico estable;
- calcula solo hash tecnico preliminar marcado como `candidate_not_final`.

## Tests Cubiertos

- candidato `alta` desde `alta_inicial`;
- candidato `alta` desde `alta_subsanacion`;
- candidato `anulacion`;
- rechazo de operacion no `processing`;
- rechazo de identidad fiscal ausente;
- rechazo de snapshot hash ausente;
- rechazo de `issuerNif`, `numserie` y `fechaExpedicion` ausentes;
- hash input estable;
- mismo input produce la misma representacion canonica;
- cambia si cambia `previousHash`;
- cambia si cambia `documentSnapshotHash`;
- primer registro permite `previousHash` vacio;
- registro posterior exige `previousHash`;
- rechazo de `previousRecordId` sin `previousHash`;
- rechazo de `previousHash` no normalizado;
- ausencia de XML AEAT y escrituras DB en respuestas.

## Limites

- No hay XML AEAT definitivo.
- No hay transporte AEAT.
- No hay certificados reales.
- No hay persistencia en `fiscal_records`.
- No hay actualizacion de `fiscal_chain_state`.
- No hay `fiscal_transport_attempts`.
- No hay cumplimiento VeriFactu productivo.
- No hay UI ni formularios reales.

## Queda Para 2B.4L

- Definir la persistencia local/staging del registro fiscal final.
- Diseñar la asignacion de secuencia/cadena.
- Separar con cuidado XML definitivo, transporte y certificados en fases
  posteriores.

## Confirmaciones

- No Supabase produccion.
- No staging remoto.
- No AEAT real.
- No certificados reales.
- No XML AEAT definitivo.
- No transporte.
- No escrituras en `fiscal_records`.
- No actualizaciones en `fiscal_chain_state`.
- No creacion de `fiscal_transport_attempts`.
- No Vercel config.
- No Stripe, precios, planes, IA ni importadores.
