# Phase 2B.7D - Official Artifact Local Validation v1

PHASE2B7D_OFFICIAL_ARTIFACT_LOCAL_VALIDATION_V1

Estado: no implementado.

Bloqueo: `BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR`.

## Motivo

No se implementa validacion XSD local offline porque las opciones disponibles no
cumplen las restricciones de la fase:

- `xsd-schema-validator` requiere Java;
- `libxmljs2` introduce modulo nativo y `node-gyp`;
- `fast-xml-parser` no realiza validacion XSD real;
- una comprobacion manual de tags no seria validacion XSD.

## Confirmacion

- no se llama validacion AEAT;
- no se descarga nada durante tests;
- no se simula validacion XSD;
- no se declara XML aceptado contra XSD;
- no se anaden dependencias.

Validador: `npm run validate:phase2b7d-official-artifact-local-validation`.
