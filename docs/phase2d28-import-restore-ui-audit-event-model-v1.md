# PHASE2D28_IMPORT_RESTORE_UI_AUDIT_EVENT_MODEL_V1

Fase 2D.28 define eventos UI in-memory para la shell deshabilitada.

Eventos:

- ui_shell_viewed;
- backup_selected_for_review;
- validation_preview_requested;
- review_model_built;
- apply_import_clicked_but_blocked;
- apply_restore_clicked_but_blocked;
- malformed_backup_rejected.

Reglas:

- in-memory only;
- persisted false;
- no localStorage write;
- no payload;
- no file content;
- no document bodies;
- no secrets;
- sin produccion;
- sin Supabase;
- sin documentos reales.

Archivos:

- `src/lib/local-data-safety/import-restore-ui-audit.ts`
- `src/lib/local-data-safety/import-restore-ui-audit.test.ts`
