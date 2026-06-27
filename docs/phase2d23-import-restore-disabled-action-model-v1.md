# PHASE2D23_IMPORT_RESTORE_DISABLED_ACTION_MODEL_V1

Fase 2D.23 define un modelo de acciones deshabilitadas para import/restore.

Acciones representadas:

- choose_file;
- validate_backup;
- build_review;
- apply_import;
- apply_restore;
- download_recovery_snapshot;
- cancel.

Reglas:

- apply_import bloqueado;
- apply_restore bloqueado;
- download_recovery_snapshot bloqueado hasta revision futura;
- choose_file y cancel solo future_ui_only;
- validate_backup y build_review solo preview_only;
- no side effects.

Archivos:

- `src/lib/local-data-safety/import-restore-disabled-actions.ts`
- `src/lib/local-data-safety/import-restore-disabled-actions.test.ts`
