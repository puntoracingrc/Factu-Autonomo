# Phase 2D.46 - Import/restore synthetic UI fixtures

Marker: `PHASE2D46_IMPORT_RESTORE_SYNTHETIC_UI_FIXTURES_V1`

## Objetivo

Crear fixtures sinteticos para revisar estados de UI sin usar datos reales.

## Casos

- safe backup preview;
- protected overwrite warning;
- malformed backup rejected;
- snapshot mismatch manual review;
- numbering risk manual review;
- empty backup;
- large list paginated.

Todos los identificadores empiezan por `SYNTHETIC_ONLY_`.

## Limites

No hay datos reales, snapshots completos, PDF, tokens, secretos ni AppData masivo.

Funciones:

- `getImportRestoreSyntheticUiFixture(...)`
- `listImportRestoreSyntheticUiFixtures(...)`
- `validateImportRestoreSyntheticUiFixture(...)`

Evidencia tecnica interna. No hay import real, restore real ni produccion.
