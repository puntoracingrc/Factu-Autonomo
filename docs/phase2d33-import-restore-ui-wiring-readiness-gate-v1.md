# PHASE2D33_IMPORT_RESTORE_UI_WIRING_READINESS_GATE_V1

Fase 2D.33 define el gate de readiness para un wiring futuro de UI import/restore.

Objetivo:

- evaluar si existen piezas suficientes para una revision futura;
- mantener `canWireUi: false`;
- bloquear rutas, navegacion, file picker real y apply;
- exigir checklist explicita antes de cualquier decision posterior.

Funciones:

- `evaluateImportRestoreUiWiringReadiness`;
- `buildImportRestoreUiWiringBlockers`;
- `summarizeImportRestoreUiWiringReadiness`.

Estados:

- `blocked_by_default`;
- `ready_for_review`;
- `ready_for_explicit_wiring_decision`;
- `rejected`.

Reglas:

- bloqueado por defecto;
- apply import y apply restore deben seguir bloqueados;
- disabled actions son obligatorias;
- disabled browser storage adapter readiness es obligatoria;
- ruta, navegacion y file picker real estan bloqueados;
- el resultado no activa UI.

Limites:

- no UI conectada;
- no ruta;
- no navegacion;
- no localStorage write;
- no import/restore apply;
- sin produccion;
- sin Supabase;
- sin documentos reales.
