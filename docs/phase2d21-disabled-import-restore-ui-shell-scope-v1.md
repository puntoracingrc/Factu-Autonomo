# PHASE2D21_DISABLED_IMPORT_RESTORE_UI_SHELL_SCOPE_V1

Fase 2D.21 define el contrato de alcance para una disabled UI shell de import/restore.

Estado:

- disabled by default;
- preview_only cuando existe modelo seguro sin apply;
- blocked si aparece ruta, navegacion, integracion de app, storage access, real data o apply;
- ready_for_future_ui_integration_review solo como decision futura, no como activacion.

Controles:

- no route;
- no navigation;
- no UI conectada;
- no localStorage write;
- no import/restore apply;
- synthetic data only en tests;
- sin produccion;
- sin Supabase;
- sin documentos reales.

Archivos:

- `src/lib/local-data-safety/ui-shell-scope.ts`
- `src/lib/local-data-safety/ui-shell-scope.test.ts`
