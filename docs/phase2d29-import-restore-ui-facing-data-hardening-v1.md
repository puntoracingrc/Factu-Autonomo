# PHASE2D29_IMPORT_RESTORE_UI_FACING_DATA_HARDENING_V1

Fase 2D.29 cubre hardening de datos expuestos a la futura UI.

Casos cubiertos:

- view model con datos malformados sin payload leak;
- labels con HTML/script sanitizados o escapados;
- nombres largos truncados;
- severity desconocida con fallback seguro;
- action id desconocida blocked;
- prototype pollution no llega al view model;
- no secrets;
- no snapshots completos.

Archivos:

- `scripts/phase2d29-import-restore-ui-facing-data-hardening.test.ts`
