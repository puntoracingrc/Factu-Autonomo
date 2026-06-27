# Phase 2D.19 import restore review flow acceptance v1

Marker: `PHASE2D19_IMPORT_RESTORE_REVIEW_FLOW_ACCEPTANCE_V1`

## Objetivo

Validar de forma sintetica el flujo completo de revision import/restore local sin mutaciones, sin UI, sin storage real y sin Supabase.

## Casos acceptance

1. intake backup JSON sintetico;
2. validation pipeline valido;
3. review model generado;
4. protected overwrite produce manual review;
5. human confirmation default false;
6. approvals true still no apply;
7. apply blocker blocks import/restore;
8. disabled localStorage adapter blocks read/write;
9. malformed backup rejected;
10. report seguro sin leaks;
11. no localStorage writes;
12. no filesystem;
13. no Supabase;
14. no UI.

## Evidencia

- `scripts/phase2d19-import-restore-review-flow-acceptance.test.ts`
- `test:phase2d19-import-restore-review-flow-acceptance`
- `validate:phase2d19-import-restore-review-flow-acceptance`

Evidencia tecnica interna; solo fixtures sinteticos `SYNTHETIC_ONLY_*`.
