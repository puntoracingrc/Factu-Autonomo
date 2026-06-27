# PHASE2D42_IMPORT_RESTORE_ROUTE_NAVIGATION_BLOCKER_VALIDATION_V1

Fase 2D.42 valida que no se conecta la UI import/restore a rutas ni navegacion.

Cobertura:

- no app route nueva;
- no page nueva;
- no public asset operativo;
- no cambio de navegacion/sidebar/menu/layout;
- no router import en shell;
- no Link import en shell;
- no `href` en shell;
- disabled browser storage adapter sigue bloqueado;
- no export desde app-level index.

Archivo:

- `scripts/phase2d42-import-restore-route-navigation-blocker-validation.test.ts`

Resultado esperado:

- no ruta;
- no navegacion;
- no UI conectada;
- no file picker real;
- no localStorage read/write.
