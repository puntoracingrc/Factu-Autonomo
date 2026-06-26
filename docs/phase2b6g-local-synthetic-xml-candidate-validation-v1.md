# Phase 2B.6G - Local Synthetic XML Candidate Validation v1

Estado: cerrado como fase sintetica local.

## Alcance

Esta fase valida localmente el XML candidato sintetico en memoria. No valida
contra servicios externos ni contra esquemas oficiales.

La validacion comprueba:

- root interno y namespace interno;
- `syntheticOnly: true`;
- `finality: candidate_not_aeat`;
- `transportable: false`;
- digest del XML en memoria;
- digest candidato del material canonico;
- referencia previa candidata cuando existe;
- ausencia de material bloqueado de firma, certificados, endpoints externos y
  envio.

## Escenarios

- `SYNTHETIC_ONLY_ALTA_BASIC_001`: aceptado como candidato local.
- `SYNTHETIC_ONLY_CHAIN_FIRST_001`: aceptado como candidato local.
- `SYNTHETIC_ONLY_CHAIN_SECOND_001`: aceptado como candidato local.
- `SYNTHETIC_ONLY_CANCEL_BASIC_001`: aceptado como candidato local.
- `SYNTHETIC_ONLY_ALTA_INVALID_NIF_001`: rechazado por razon controlada.
- `SYNTHETIC_ONLY_ALTA_INVALID_DATE_001`: rechazado por razon controlada.
- `SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001`: rechazado por razon controlada.
- `SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001`: rechazado por razon controlada.

## Fuera de alcance

- XML oficial;
- validacion AEAT;
- QR;
- firma;
- certificados;
- transporte real;
- persistencia.

## Pruebas y validador

- `src/lib/verifactu-candidate-pipeline/validate-xml-candidate.test.ts`;
- `src/lib/verifactu-candidate-pipeline/pipeline.test.ts`;
- `npm run validate:phase2b6g-local-xml-candidate-validation`.
