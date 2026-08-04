# 2E.7 Corruption parse recovery classifier

Marker: `PHASE2E7_CORRUPTION_PARSE_RECOVERY_CLASSIFIER_V1`

Estado: clasificador / recovery preview only / no apply.

## Casos

- JSON invalido.
- JSON valido con shape incorrecta.
- AppData parcial.
- Backup manifest sin datos completos.
- Shape con riesgo de prototype pollution.
- Arrays criticos ausentes.
- Shape legacy.

## Decisiones

- `recoverable_preview_only`
- `manual_review_required`
- `blocked_corrupted`
- `unsupported_shape`

## Reglas

- No hay reparacion automatica.
- No se aplica migracion.
- No se escribe storage.
- Todo plan mantiene `applyAllowed: false`.
- Los summaries no incluyen payload.
