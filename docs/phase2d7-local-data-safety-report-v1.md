# Phase 2D.7 local data safety report v1

Marker: PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1

El reporte de seguridad de datos locales agrega manifiesto, digest, dry-run, snapshot, restore plan y eventos in-memory en una respuesta segura. Su funcion es preparar evidencia para una futura UI sin exponer datos completos.

## Controles

- reporta conteos y flags, no cuerpos completos;
- indica si existe digest sin exponer datos de entrada;
- incluye totales de eventos por tipo;
- redacciona campos no aptos para reporte;
- falla si el reporte no queda marcado como seguro.

Estado: SAFE SUMMARY ONLY / NO RAW DATA REPORT
