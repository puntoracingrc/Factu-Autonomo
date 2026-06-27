# PHASE2D22_IMPORT_RESTORE_REVIEW_VIEW_MODEL_V1

Fase 2D.22 crea view models seguros para una futura pantalla de revision de import/restore.

Campos seguros:

- title y subtitle;
- status y severity;
- counters;
- sections con mensajes sanitizados;
- risks como flags;
- protectedDocumentsSummary agregado;
- disabledActions;
- previewList;
- nextSteps;
- limitBanner.

No contiene app data completa, documentos completos, snapshots completos, PDFs, secrets, payloads ni datos reales.

Controles:

- view models seguros;
- no UI conectada;
- no rutas;
- no navegacion;
- no localStorage write;
- no import/restore apply;
- sin produccion;
- sin Supabase;
- sin documentos reales.

Archivos:

- `src/lib/local-data-safety/import-restore-view-model.ts`
- `src/lib/local-data-safety/import-restore-view-model.test.ts`
