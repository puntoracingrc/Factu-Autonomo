# Phase 2B.7E - Pre QR Signature Transport Checkpoint v1

PHASE2B7E_PRE_QR_SIGNATURE_TRANSPORT_CHECKPOINT_V1

PHASE2B7_OFFICIAL_ARTIFACT_ALIGNMENT: BLOCKED

## Resumen

2B.7A queda cerrada como revision tecnica del pipeline sintetico.

2B.7B queda cerrada como manifest y mapping de artefactos oficiales, con puerta
de avance bloqueada.

2B.7C no se implementa.

2B.7D no se implementa.

## Bloqueos

- artefacto pendiente: XSD no commiteado como fixture offline;
- version pendiente: no pendiente, se identifico `tikeV1.0`;
- mapping pendiente: transformaciones de fecha/importes y valores oficiales
  sinteticos seguros;
- validador pendiente: `BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR`;
- dato sintetico oficial pendiente: NIF/serie/importe/huella seguros para todos
  los campos requeridos.

## Artefactos y checksums

- `AEAT_VERIFACTU_RECORD_DESIGN_XLSX_V1_0`:
  `40ce191aa1def6e44a5f1e86d7ece727258745b34e3fe4d6abe1468252dac2ca`.
- `AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0`:
  `cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36`.
- `AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0`:
  `ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1`.
- `AEAT_VERIFACTU_HASH_SPEC_PDF_V0_1_2`:
  `f4334c254bb875b417247b54315199f89d75a8c4814dfd1e86efec562653d7de`.
- `AEAT_VERIFACTU_VALIDATIONS_ERRORS_PDF_V1_2_2`:
  `426eb926fc098a36a163f66ca5f40d9e0847ca23300bbe5008979832d3513440`.
- `AEAT_VERIFACTU_SERVICE_SPEC_PDF_V1_0_3`:
  `b3570f6a308ce98a5f52001a0dc427310ad6cf7bccd60a9ee98720a59e553c02`.

## Limites obligatorios

NO PRODUCTION
NO REAL DATA
NO AEAT CONNECTION
NO TRANSPORT
NO QR
NO SIGNATURE
NO CERTIFICATES
NO PRODUCTIVE VERIFACTU

## Siguiente decision recomendada

Decidir por separado una estrategia de validacion XSD offline reproducible y
segura, y si procede commitear XSD oficiales como fixtures de test con licencia,
checksum y version fijada. No empezar 2B.8 automaticamente.
