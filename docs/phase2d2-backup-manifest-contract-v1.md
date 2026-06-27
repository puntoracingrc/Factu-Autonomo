# Phase 2D.2 backup manifest contract v1

Marker: PHASE2D2_BACKUP_MANIFEST_CONTRACT_V1

El contrato de manifiesto describe el contenido de una copia local ya cargada en memoria sin copiar cuerpos completos de documentos ni snapshots. Su objetivo es permitir que una futura UI pueda mostrar conteos, riesgos y referencias protegidas antes de cualquier accion.

## Garantias

- manifiesto versionado `local-data-backup-manifest-v1`;
- conteos separados de documentos, clientes, proveedores, gastos, contadores, borradores y protegidos;
- referencias seguras de documentos protegidos;
- flags de riesgo para emitidos, bloqueados, legacy no borrador, hashes y numeracion;
- resumen seguro sin payload completo.

## Limites

- no lee almacenamiento real;
- no escribe backup;
- no modifica documentos;
- no habilita importacion ni restauracion real;
- no declara cumplimiento productivo.
