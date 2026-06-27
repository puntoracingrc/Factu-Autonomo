# PHASE2D37_DISABLED_IMPORT_RESTORE_WIRING_PROPS_FACTORY_V1

Fase 2D.37 crea una factory de props seguras para el shell React deshabilitado.

Objetivo:

- construir `viewModel` y `scope` para el shell;
- adjuntar disabled actions;
- adjuntar adapter de archivo bloqueado;
- adjuntar handlers no-op/blocked;
- adjuntar wiring readiness.

Funciones:

- `buildDisabledImportRestoreShellProps`;
- `assertDisabledImportRestoreShellPropsSafe`;
- `summarizeDisabledImportRestoreShellProps`.

Reglas:

- `routeConnected: false`;
- `navigationConnected: false`;
- `filePickerConnected: false`;
- `applyImportAllowed: false`;
- `applyRestoreAllowed: false`;
- disabled actions obligatorias;
- props sin payloads, secretos ni snapshots completos.

Limites:

- disabled UI wiring;
- props seguros;
- no UI conectada;
- no ruta;
- no navegacion;
- no localStorage write;
- no import/restore apply;
- sin produccion;
- sin Supabase;
- sin documentos reales.
