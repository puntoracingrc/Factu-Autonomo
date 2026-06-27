# Phase 2D.16 disabled localStorage adapter contract v1

Marker: `PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1`

## Objetivo

Definir el contrato futuro para un adaptador de localStorage, pero mantenerlo deshabilitado por defecto. La fase solo prepara la forma de respuesta para un diseno UI posterior.

## Estado

- `status: disabled`;
- `canRead: false`;
- `canWrite: false`;
- `reason: DISABLED_PENDING_UI_REVIEW_AND_BACKUP`.

## Limites

- no importa `window`;
- no lee localStorage;
- no escribe localStorage;
- no accede al global del navegador;
- no UI;
- no route changes;
- no documentos reales;
- no Supabase;
- no produccion.

## Evidencia

- `src/lib/local-data-safety/localstorage-adapter-contract.ts`
- `src/lib/local-data-safety/localstorage-adapter-contract.test.ts`
- `validate:phase2d16-disabled-localstorage-adapter-contract`

Evidencia tecnica interna de contrato deshabilitado; no cambia la persistencia del producto.
