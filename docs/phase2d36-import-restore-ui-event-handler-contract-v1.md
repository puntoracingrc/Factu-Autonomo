# PHASE2D36_IMPORT_RESTORE_UI_EVENT_HANDLER_CONTRACT_V1

Fase 2D.36 define handlers de UI no operativos o bloqueados.

Objetivo:

- preparar un contrato de eventos para preview y clicks futuros;
- permitir preview dry-run solo en memoria;
- bloquear cualquier click de apply import;
- bloquear cualquier click de apply restore;
- registrar eventos UI solo en memoria.

Funciones:

- `createImportRestoreDisabledUiEventHandlers`;
- `handleImportRestorePreviewRequested`;
- `handleImportRestoreApplyImportClicked`;
- `handleImportRestoreApplyRestoreClicked`;
- `summarizeImportRestoreUiHandlerResult`.

Reglas:

- preview devuelve resultado dry-run in-memory;
- apply import siempre blocked;
- apply restore siempre blocked;
- `mutated: false`;
- sin payload echo;
- eventos de auditoria UI in-memory.

Limites:

- no UI conectada;
- no file picker real;
- no localStorage write;
- no import real aplicado;
- no restore real aplicado;
- sin documentos reales;
- sin produccion;
- sin Supabase.
