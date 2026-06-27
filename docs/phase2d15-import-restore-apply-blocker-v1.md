# Phase 2D.15 import restore apply blocker v1

Marker: `PHASE2D15_IMPORT_RESTORE_APPLY_BLOCKER_V1`

## Objetivo

Centralizar el bloqueo explicito de cualquier intento futuro de apply para import o restore mientras el flujo solo esta preparado como review flow.

## Resultado

El resultado seguro contiene:

- `blocked: true`;
- `operation: import` o `restore`;
- `reason: APPLY_DISABLED_PENDING_UI_AND_EXTERNAL_REVIEW`;
- `safe: true`.

## Limites

- import apply siempre bloqueado;
- restore apply siempre bloqueado;
- approvals true siguen bloqueados;
- no mutacion;
- no localStorage;
- no UI;
- no documentos reales;
- no Supabase;
- no produccion.

## Evidencia

- `src/lib/local-data-safety/import-restore-apply-blocker.ts`
- `src/lib/local-data-safety/import-restore-apply-blocker.test.ts`
- `validate:phase2d15-import-restore-apply-blocker`

Evidencia tecnica interna; no habilita importador funcional ni restore productivo.
