# Phase 2D.11 backup file intake contract v1

Marker: `PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1`

## Objetivo

Definir el contrato tecnico interno para inspeccionar una copia JSON antes de cualquier pipeline de revision. Es un contrato UI-facing sin UI real y solo opera sobre metadatos y un objeto ya parseado en memoria.

## Alcance permitido

- nombre de archivo;
- mime/type declarado;
- tamano en bytes;
- objeto parseado sintetico opcional;
- summary seguro sin eco de contenido.

## Limites

- no lee archivos reales;
- no usa filesystem;
- no usa localStorage;
- no escribe storage;
- no aplica import ni restore;
- no toca documentos reales;
- no usa Supabase;
- no produccion.

## Reglas

- extension permitida: `.json`;
- mime esperado: `application/json` o vacio controlado;
- rechaza `.zip`, `.pdf`, `.xml`, `.html`, `.js` y `.csv`;
- rechaza nombres con rutas, `..`, controles o patrones sensibles;
- rechaza candidatos por encima del tamano maximo configurable;
- no devuelve contenido del backup en el summary.

## Evidencia

- `src/lib/local-data-safety/backup-intake.ts`
- `src/lib/local-data-safety/backup-intake.test.ts`
- `validate:phase2d11-backup-file-intake-contract`

Evidencia tecnica interna; no declara importacion productiva ni restauracion productiva.
