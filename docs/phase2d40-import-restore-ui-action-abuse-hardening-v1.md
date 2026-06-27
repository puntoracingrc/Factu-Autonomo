# PHASE2D40_IMPORT_RESTORE_UI_ACTION_ABUSE_HARDENING_V1

Fase 2D.40 valida hardening de acciones UI abusivas.

Cobertura:

- action forged como `apply_import`;
- action forged como `apply_restore`;
- action unknown;
- payload grande;
- evento con snapshot;
- evento con token/secret;
- filename malicioso;
- clicks repetidos de apply;
- no mutation;
- no payload echo.

Archivo:

- `scripts/phase2d40-import-restore-ui-action-abuse-hardening.test.ts`

Resultado esperado:

- apply import blocked;
- apply restore blocked;
- handlers mantienen `mutated: false`;
- eventos seguros solo in-memory.
