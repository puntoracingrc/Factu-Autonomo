# Informe de validación del corpus ampliado

**Estado:** `VALIDATED_SYNTHETIC_CORPUS_EXTENSION`

- Familias esperadas: 29
- Casos semánticos base esperados: 116
- PDF totales esperados: 348
- PDF comprobados: 348
- PDF válidos: 348
- Errores: 0
- Advertencias: 0

## Cobertura

- Cuatro casos semánticos por familia: habitual, negativo/cero, complejo e incompleto/ambiguo.
- Tres variantes visuales por caso: nativa, escaneada/comprimida y captura girada.
- Verificación de inferencias prohibidas y tratamiento especial de documentos incompletos.

## Comprobaciones ejecutadas

- Counts by family, semantic scenario and visual variant.
- Manifest structure and official-source domains.
- SHA-256 and page count.
- Native text layer and synthetic markers.
- Raster-only variants and embedded page images.
- First-page non-blank render check.
- Incomplete/ambiguous cases require review.
- Empty 720/721 examples are drafts and cannot prove absence.

## Limitaciones

- No PDF was generated or validated by a live AEAT/TGSS service.
- Documents are synthetic facsimiles based on official fields, descriptions and record designs.
- Real anonymized outputs should later be added as an independent validation layer.

## Recuento por familia

- `AEAT_CERT_CURRENT_CENSUS_STATUS`: 12
- `AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION`: 12
- `AEAT_CERT_ROI`: 12
- `AEAT_FORM_035`: 12
- `AEAT_MODEL_100`: 12
- `AEAT_MODEL_123`: 12
- `AEAT_MODEL_131`: 12
- `AEAT_MODEL_151`: 12
- `AEAT_MODEL_180`: 12
- `AEAT_MODEL_184`: 12
- `AEAT_MODEL_190`: 12
- `AEAT_MODEL_193`: 12
- `AEAT_MODEL_200`: 12
- `AEAT_MODEL_202`: 12
- `AEAT_MODEL_216`: 12
- `AEAT_MODEL_296`: 12
- `AEAT_MODEL_308`: 12
- `AEAT_MODEL_309`: 12
- `AEAT_MODEL_341`: 12
- `AEAT_MODEL_347`: 12
- `AEAT_MODEL_349`: 12
- `AEAT_MODEL_369`: 12
- `AEAT_MODEL_714`: 12
- `AEAT_MODEL_720`: 12
- `AEAT_MODEL_721`: 12
- `AEAT_MODEL_840`: 12
- `TGSS_REPORT_CURRENT_STATUS`: 12
- `TGSS_REPORT_EMPLOYMENT_HISTORY`: 12
- `TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES`: 12
