# PHASE2D35_IN_MEMORY_BACKUP_PREVIEW_PARSER_HARNESS_V1

Fase 2D.35 anade un harness sintetico de preview local en memoria.

Objetivo:

- recibir JSON ya disponible en memoria;
- parsear con limite de tamano;
- ejecutar validation pipeline y review/view models;
- devolver solo resultado de preview o error seguro;
- no aplicar cambios.

Funciones:

- `parseInMemoryBackupJsonForPreview`;
- `buildInMemoryBackupPreviewHarnessResult`;
- `summarizeInMemoryBackupPreviewHarness`.

Reglas:

- entrada `string`/`unknown` sintetica, no archivo real;
- limite por defecto de 1 MB;
- `JSON.parse` controlado;
- malformed backup hardening por validation pipeline;
- sin payload echo;
- `applyImportAllowed: false`;
- `applyRestoreAllowed: false`.

Limites:

- local file preview harness sintetico;
- no file picker real;
- no filesystem;
- no localStorage write;
- no import/restore apply;
- sin documentos reales;
- sin produccion;
- sin Supabase.
