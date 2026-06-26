# Phase 2B.6F - In-Memory Synthetic XML Candidate v1

Estado: cerrado como fase sintetica local.

## Alcance

Esta fase construye un XML candidato minimo en memoria para los escenarios
sinteticos positivos. El root interno es
`FactuAutonomoSyntheticFiscalCandidate` y el namespace interno es
`urn:factura-autonomo:synthetic:fiscal-candidate:v1`.

El artefacto:

- usa `schemaVersionCandidate: phase2b6f-v1`;
- declara `syntheticOnly: true`;
- declara `finality: candidate_not_aeat`;
- declara `transportable: false`;
- no se guarda en disco;
- no se imprime como XML;
- solo expone el XML mediante `getXmlForLocalValidation()`;
- serializa JSON y `toString()` como resumen seguro.

## Fuera de alcance

- XML oficial;
- XML AEAT;
- esquemas oficiales;
- QR;
- firma;
- certificados;
- conexion externa;
- persistencia.

## Pruebas y validador

- `src/lib/verifactu-candidate-pipeline/xml-candidate.test.ts`;
- `npm run validate:phase2b6f-in-memory-xml-candidate`.

El XML candidato es un contenedor tecnico interno, no un documento fiscal.
