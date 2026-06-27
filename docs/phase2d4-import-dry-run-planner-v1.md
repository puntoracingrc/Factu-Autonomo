# Phase 2D.4 import dry-run planner v1

Marker: PHASE2D4_IMPORT_DRY_RUN_PLANNER_V1

El planificador de importacion compara datos actuales e incoming en memoria y devuelve una decision por documento. Todas las decisiones son dry-run y no aplican cambios.

## Decisiones

- `add_document`: documento entrante nuevo;
- `update_draft`: cambio posible sobre borrador;
- `keep_current`: sin cambio relevante;
- `manual_review`: requiere revision humana;
- `reject_protected`: intento de sobrescritura de documento protegido.

## Controles

- documentos emitidos, bloqueados y legacy no borrador no se sobrescriben;
- cambios de hashes de snapshot se elevan a revision o bloqueo;
- cambios de contadores se marcan como riesgo;
- los datos de entrada no se mutan.

Estado: DRY RUN ONLY / NO IMPORT APPLY
