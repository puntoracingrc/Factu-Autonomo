# PHASE2D27_IMPORT_RESTORE_SAFE_ERROR_PRESENTER_V1

Fase 2D.27 crea un presentador de errores seguro para import/restore.

Reglas:

- no stack;
- no payload;
- no file content;
- no document bodies;
- no secrets;
- mensaje humano;
- pasos de remediacion.

Archivos:

- `src/lib/local-data-safety/import-restore-error-presenter.ts`
- `src/lib/local-data-safety/import-restore-error-presenter.test.ts`
