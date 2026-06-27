# Phase 2D.1 local data backup/import surface audit v1

Marker: PHASE2D1_LOCAL_DATA_BACKUP_IMPORT_SURFACE_AUDIT_V1

Alcance: auditoria documental de la futura superficie de backup, importacion y recuperacion de datos locales. No implementa UI, no lee almacenamiento real y no aplica cambios sobre datos reales.

## Superficies revisadas

- datos locales ya cargados en memoria;
- documentos emitidos, bloqueados o legacy no borrador;
- borradores editables;
- clientes/proveedores/gastos como referencias auxiliares;
- contadores y numeracion como estado sensible;
- snapshots documentales y referencias de hash.

## Riesgos principales

- sobrescritura accidental de documentos protegidos;
- perdida de huecos o numeracion historica;
- importaciones que mezclen borradores con emitidos;
- reportes con datos completos en vez de resumen seguro;
- recuperaciones que parezcan aplicar cambios reales sin aprobacion humana.

## Control adoptado

La fase 2D.1-2D.10 define solo contratos puros, planificadores dry-run, resumen seguro, eventos in-memory y checkpoint. Cualquier UI, lectura de almacenamiento real o aplicacion de import/restauracion queda fuera.

Estado: READY FOR PURE CONTRACT IMPLEMENTATION / NO DATA MUTATION
