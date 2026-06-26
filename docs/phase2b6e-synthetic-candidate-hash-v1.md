# Phase 2B.6E - Synthetic Candidate Hash v1

Estado: cerrado como fase sintetica local.

## Alcance

Esta fase calcula una huella candidata determinista sobre el material canonico
2B.6D. La huella usa `sha256-candidate-v1` y se conserva como artefacto
interno.

Propiedades:

- entrada requerida: material `phase2b6d-candidate-canonical-v1`;
- salida: digest `sha256-candidate-v1:<hex>`;
- `officialFingerprint: false`;
- `finality: candidate_not_aeat`;
- sin dependencia de red, base de datos ni producto.

## Fuera de alcance

- huella oficial VERI*FACTU;
- cadena fiscal productiva;
- firma;
- QR;
- XML oficial o AEAT;
- transporte.

## Pruebas y validador

- `src/lib/verifactu-candidate-pipeline/candidate-hash.test.ts`;
- `npm run validate:phase2b6e-synthetic-candidate-hash`.

La huella es solo evidencia tecnica interna de estabilidad, no una huella
fiscal oficial.
