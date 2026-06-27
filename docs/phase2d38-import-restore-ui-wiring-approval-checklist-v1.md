# PHASE2D38_IMPORT_RESTORE_UI_WIRING_APPROVAL_CHECKLIST_V1

Fase 2D.38 define el checklist minimo para una decision futura de wiring UI.

El checklist no autoriza wiring. Todos los campos empiezan en `false` y deben revisarse en una fase posterior con orden explicita.

Template:

- `uxReviewApproved`;
- `legalReviewApproved`;
- `dataLossRiskReviewed`;
- `backupBeforeImportRequired`;
- `applyStillBlockedConfirmed`;
- `localStorageAdapterStillDisabledConfirmed`;
- `routeNavigationApproved`;
- `ownerApproval`.

Reglas:

- all false por defecto;
- sin URLs privadas;
- sin secrets;
- no habilita apply;
- no habilita ruta;
- no habilita navegacion;
- no habilita file picker real.

Limites:

- evidencia tecnica interna;
- no UI conectada;
- no import real ejecutado;
- no restore real ejecutado;
- sin produccion;
- sin Supabase;
- sin documentos reales.
