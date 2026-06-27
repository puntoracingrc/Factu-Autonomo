# PHASE2D41_IMPORT_RESTORE_ACCESSIBILITY_REGRESSION_ACCEPTANCE_V1

Fase 2D.41 valida regresiones de accesibilidad del modelo UI-facing.

Cobertura:

- disabled actions tienen reason text;
- status no depende solo de color;
- secciones con labels;
- error presenter con pasos de remediacion;
- preview list con count y position;
- copy prohibido ausente;
- sin "Importar ahora";
- sin "Restaurar ahora".

Archivo:

- `scripts/phase2d41-import-restore-accessibility-regression-acceptance.test.ts`

Resultado esperado:

- copy prudente;
- acciones bloqueadas explicadas;
- no UI conectada;
- no import/restore apply.
