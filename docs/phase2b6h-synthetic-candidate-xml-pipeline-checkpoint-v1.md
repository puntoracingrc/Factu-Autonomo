# Phase 2B.6H - Synthetic Candidate XML Pipeline Checkpoint v1

PHASE2B6_SYNTHETIC_CANDIDATE_XML_PIPELINE: CLOSED / SYNTHETIC LOCAL ONLY

## Estado

La tuberia sintetica candidata queda cerrada para uso interno local:

1. descriptor sintetico controlado;
2. entrada candidata sintetica;
3. canonicalizacion interna;
4. huella candidata `sha256-candidate-v1`;
5. XML candidato minimo en memoria;
6. validacion local;
7. resumen seguro.

## Limites explicitos

NO OFFICIAL XML
NO AEAT XML
NO QR
NO SIGNATURE
NO CERTIFICATES
NO TRANSPORT
NO AEAT REAL
NO PRODUCTION

Ademas:

- no hay escritura de XML en disco;
- no hay migraciones;
- no hay producto, UI ni PDF;
- no hay conexion externa;
- no hay datos reales;
- no hay secretos;
- no hay configuracion Vercel.

## Evidencia

- `src/lib/verifactu-candidate-pipeline/`;
- `scripts/validate-phase2b6d-synthetic-canonicalization.mjs`;
- `scripts/validate-phase2b6e-synthetic-candidate-hash.mjs`;
- `scripts/validate-phase2b6f-in-memory-xml-candidate.mjs`;
- `scripts/validate-phase2b6g-local-xml-candidate-validation.mjs`;
- `scripts/validate-phase2b6d-h-synthetic-candidate-pipeline.mjs`.

## Siguiente decision recomendada

Antes de avanzar a cualquier fase posterior se debe decidir por separado si
procede revision externa del contrato candidato y como se mantendra separado de
XML oficial, firma, QR, certificados y transporte.
