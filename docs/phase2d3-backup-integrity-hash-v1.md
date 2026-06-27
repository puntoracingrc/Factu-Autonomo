# Phase 2D.3 backup integrity hash v1

Marker: PHASE2D3_BACKUP_INTEGRITY_HASH_V1

La integridad de backup se calcula sobre una representacion canonica y estable de datos locales relevantes. El digest usa SHA-256 y permite verificar si los datos planificados siguen correspondiendo al estado usado por el manifiesto.

## Canonicalizacion

- orden estable de documentos y entidades;
- campos volatiles como fechas de actualizacion quedan fuera;
- se incluyen identificadores, estado, ciclo, bloqueo, numeracion y hashes de snapshot;
- no se incluyen cuerpos completos de snapshot ni binarios.

## Limites

- evidencia tecnica interna;
- no firma documentos;
- no transmite datos;
- no escribe en almacenamiento;
- no sustituye revision externa.
