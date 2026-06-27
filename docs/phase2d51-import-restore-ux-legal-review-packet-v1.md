# Phase 2D.51 - Import/restore UX/legal review packet

Marker: `PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1`

## Objetivo

Preparar un paquete de revision UX/legal sin payload, sin imagenes y sin datos reales.

## Incluye

- feature status: routeless synthetic preview only;
- decisiones de copy;
- acciones deshabilitadas;
- resumen de avisos de perdida de datos;
- riesgos no resueltos;
- aprobaciones requeridas en `false`;
- placeholders de capturas sin imagen incluida.

Funciones:

- `buildImportRestoreUxLegalReviewPacket(...)`
- `redactImportRestoreUxLegalReviewPacket(...)`
- `assertImportRestoreUxLegalReviewPacketSafe(...)`

No habilita wiring, ruta, navegacion, localStorage, descarga real ni apply.
