# Phase 2D.52 - Routeless import/restore UI interaction acceptance

Marker: `PHASE2D52_ROUTELESS_IMPORT_RESTORE_UI_INTERACTION_ACCEPTANCE_V1`

## Objetivo

Validar la interaccion esperada del harness sin conectar UI real.

## Casos cubiertos

- carga de fixture segura;
- parse preview;
- estado `review_ready`;
- sesion de revision;
- apply import bloqueado;
- apply restore bloqueado;
- reset preview;
- fixture malformada a `error_safe`;
- avisos visibles en modelo;
- no localStorage;
- no FileReader;
- no route/navigation.

Script: `test:phase2d52-routeless-import-restore-ui-interaction-acceptance`.
