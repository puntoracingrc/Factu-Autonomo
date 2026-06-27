# Phase 2D.49 - Import/restore data-loss warning model

Marker: `PHASE2D49_IMPORT_RESTORE_DATA_LOSS_WARNING_MODEL_V1`

## Objetivo

Representar avisos prudentes de riesgo antes de cualquier futura decision de UX.

## Avisos

- protected documents;
- snapshot mismatch;
- numbering risk;
- backup older or unknown;
- malformed backup;
- apply disabled;
- need backup before future actions.

Funciones:

- `buildImportRestoreDataLossWarnings(...)`
- `summarizeImportRestoreDataLossWarnings(...)`

El copy evita promesas absolutas, exito operativo o lenguaje de restauracion inmediata. Las acciones siguen bloqueadas.
