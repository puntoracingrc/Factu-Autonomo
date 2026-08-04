# 2E.5 Storage operation dry-run planner

Marker: `PHASE2E5_STORAGE_OPERATION_DRY_RUN_PLANNER_V1`

Estado: planner dry-run / no apply / sin storage real.

## Operaciones modeladas

- `read`
- `write`
- `delete`
- `replace_app_data`
- `backup_before_write`
- `verify_after_write`

## Reglas

- Las escrituras, borrados y reemplazos quedan bloqueados por defecto.
- La lectura solo puede quedar permitida en modo in-memory y con clave sintetica.
- Toda escritura futura requiere backup-before-write.
- `applyAllowed` es siempre `false`.
- No se toca almacenamiento real ni se mutan datos reales.

## Salida segura

`summarizeLocalStorageResilienceOperationPlan` expone operacion, decision, numero de blockers y flags de seguridad, sin valores.
