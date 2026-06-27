# PHASE2D26_IMPORT_RESTORE_PREVIEW_LIST_MODEL_V1

Fase 2D.26 define un modelo de lista preview para resumen paginado.

Reglas:

- solo summaries;
- no documentos completos;
- page size maximo de 50;
- orden estable por id seguro;
- filtros por severity y status;
- labels sanitizados y truncados.

Archivos:

- `src/lib/local-data-safety/import-restore-preview-list.ts`
- `src/lib/local-data-safety/import-restore-preview-list.test.ts`
