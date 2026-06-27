# PHASE2D39_LOCAL_IMPORT_RESTORE_PREVIEW_HARNESS_ACCEPTANCE_V1

Fase 2D.39 valida la aceptacion local del harness sintetico de preview.

Cobertura:

- JSON sintetico en memoria;
- parse preview;
- validation pipeline;
- view model;
- props factory;
- preview handler;
- apply import blocked;
- apply restore blocked;
- file picker adapter blocked;
- no localStorage write;
- no filesystem runtime;
- no UI route;
- no real data.

Archivo:

- `scripts/phase2d39-local-import-restore-preview-harness-acceptance.test.ts`

Resultado esperado:

- local file preview harness sintetico disponible;
- no UI conectada;
- no import/restore apply;
- sin documentos reales.
