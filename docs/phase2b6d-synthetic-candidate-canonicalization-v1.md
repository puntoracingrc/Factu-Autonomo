# Phase 2B.6D - Synthetic Candidate Canonicalization v1

Estado: cerrado como fase sintetica local.

## Alcance

Esta fase convierte los descriptores sinteticos controlados 2B.6B/2B.6C en
entrada canonica candidata. El contrato vive en
`src/lib/verifactu-candidate-pipeline/` y solo acepta marcadores
`SYNTHETIC_ONLY_`.

La canonicalizacion:

- usa version `phase2b6d-candidate-canonical-v1`;
- declara `finality: candidate_not_aeat`;
- mantiene `syntheticOnly: true`;
- ordena campos de forma estable;
- calcula longitud de bytes del texto canonico interno;
- devuelve resumen seguro sin XML.

## Fuera de alcance

- XML oficial;
- XML AEAT;
- QR;
- firma;
- certificados;
- conexion externa;
- persistencia;
- uso de datos reales.

## Pruebas y validador

- `src/lib/verifactu-candidate-pipeline/canonicalize.test.ts`;
- `npm run validate:phase2b6d-synthetic-canonicalization`.

La fase no autoriza ningun paso productivo ni sustituye revision externa.
