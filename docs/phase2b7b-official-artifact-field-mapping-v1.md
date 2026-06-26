# Phase 2B.7B - Official Artifact Field Mapping v1

PHASE2B7B_OFFICIAL_ARTIFACT_FIELD_MAPPING_V1

Estado: cerrado como manifest y mapping bloqueado por puerta oficial.

## Artefactos oficiales identificados

Consulta: 2026-06-26.

| artifactId | Version | Estado | Uso |
| --- | --- | --- | --- |
| `AEAT_VERIFACTU_RECORD_DESIGN_XLSX_V1_0` | v1.0 | verified | referencia de mapping |
| `AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0` | tikeV1.0 | verified | referencia XSD no commiteada |
| `AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0` | tikeV1.0 | verified | referencia XSD no commiteada |
| `AEAT_VERIFACTU_HASH_SPEC_PDF_V0_1_2` | 0.1.2 | verified | referencia de huella |
| `AEAT_VERIFACTU_VALIDATIONS_ERRORS_PDF_V1_2_2` | 1.2.2 | verified | referencia de validaciones |
| `AEAT_VERIFACTU_SERVICE_SPEC_PDF_V1_0_3` | 1.0.3 | verified | referencia tecnica |

No se commitearon PDFs, XLSX ni XSD.

## Mapping

Se creo `src/lib/verifactu-official-alignment/` con:

- manifest de artefactos;
- tabla de campos internos frente a rutas oficiales;
- mapping controlado de descriptores positivos;
- rechazo de escenarios negativos;
- rechazo de valores sinteticos internos que no proceden de ejemplos oficiales
  seguros.

Campos con ruta oficial identificada:

- `RegistroAlta/IDFactura/IDEmisorFactura`;
- `RegistroAlta/IDFactura/NumSerieFactura`;
- `RegistroAlta/IDFactura/FechaExpedicionFactura`;
- `RegistroAlta/ImporteTotal`;
- `RegistroAlta/Encadenamiento/RegistroAnterior/Huella`;
- `RegistroAnulacion/IDFactura/IDEmisorFacturaAnulada`;
- `RegistroAnulacion/IDFactura/NumSerieFacturaAnulada`;
- `RegistroAnulacion/IDFactura/FechaExpedicionFacturaAnulada`;
- `RegistroAnulacion/Encadenamiento/RegistroAnterior/Huella`.

## Bloqueo

El mapping no produce `OfficialAlignedCandidateModel` porque:

- los valores actuales son referencias internas `SYNTHETIC_ONLY_`;
- no se ha fijado un conjunto completo de datos sinteticos oficiales seguros;
- no hay validador XSD offline seguro aprobado para esta fase.

Validador: `npm run validate:phase2b7b-official-artifact-field-mapping`.
