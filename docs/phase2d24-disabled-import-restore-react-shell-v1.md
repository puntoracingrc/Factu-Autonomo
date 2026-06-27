# PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1

Fase 2D.24 anade una React shell deshabilitada y no conectada.

La shell:

- recibe un `ImportRestoreReviewViewModel`;
- muestra banner de vista previa;
- muestra contadores, riesgos, secciones y acciones;
- renderiza todas las acciones como botones disabled;
- no define handlers de apply;
- no importa router;
- no importa storage;
- no importa Supabase;
- no se exporta desde ninguna pagina.

Estado:

- disabled UI shell;
- no UI conectada;
- no route;
- no navigation;
- no localStorage write;
- no import/restore apply;
- sin produccion;
- sin Supabase;
- sin documentos reales.

Archivos:

- `src/components/local-data-safety/ImportRestoreReviewShell.tsx`
- `src/components/local-data-safety/ImportRestoreReviewShell.test.tsx`
- `src/components/local-data-safety/index.ts`
