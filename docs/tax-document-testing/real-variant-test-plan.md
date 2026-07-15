# Plan de pruebas de variantes reales del lector fiscal

Estado verificado: 2026-07-15. Alcance: motor de perfil tributario de autónomos. Quedan fuera el motor de expedientes, las reglas fiscales, la presentación de modelos y cualquier dato real de usuario.

## Resultado del inventario inicial

- Familias registradas: 39 (30 modelos y 9 documentos sin número).
- Manifiestos/PDF existentes: 389.
- PDF nativos sintéticos: 157.
- Variantes raster/OCR sintéticas: 232.
- Fixtures incompletos sintéticos: 119.
- PDF oficiales con datos sintéticos: 0.
- PDF reales anonimizados: 0.
- Holdouts reales: 0.

Por tanto, las 39 familias están en `REAL_VARIANT_GAP`. Los fixtures existentes prueban ramas del software, pero no demuestran compatibilidad con un PDF oficial real.

## Capas separadas

1. `SYNTHETIC`: desarrollo y regresión rápida. Nunca prueba compatibilidad real.
2. `OFFICIAL_SYNTHETIC`: generado legítimamente por un servicio oficial sin presentar datos falsos.
3. `REAL_ANONYMIZED`: formato real, autorización registrada y anonimización irreversible verificada.
4. `HOLDOUT`: variante real reservada que no se usa para ajustar el extractor.

Los corpus sintéticos anteriores son read-only. Los candidatos nuevos viven bajo `test/fixtures/tax-model-diagnostic/real-variants-v1/` y no se admiten sin manifiesto independiente.

## Flujo de incorporación

1. Registrar autorización sin incluir datos identificativos en el repositorio.
2. Trabajar en un entorno local temporal; no subir el original.
3. Anonimizar texto, OCR, metadatos, formularios, XFA, anotaciones, adjuntos, capas ocultas, códigos QR/barras, nombres y rutas.
4. Calcular SHA-256 del resultado anonimizado.
5. Ejecutar el escáner técnico y una revisión visual humana independiente.
6. Crear un manifiesto cuya verdad esperada no proceda de copiar la salida del extractor.
7. Ejecutar admisión, confusiones, extracción, normalización, mapeo, inferencias prohibidas, temporalidad y layout desconocido.
8. Incorporar degradaciones deterministas y actualizar matriz/métricas.
9. Mantener holdout separado. Cuando revele un fallo, convertirlo en regresión y sustituirlo por otro holdout.

## Regla fiscal invariable

La validación técnica no modifica `ruleReviewState`. Mientras no exista aprobación fiscal nominal y el assessment no sea simultáneamente `APPROVED` y `RESOLVED`, `isTaxObligationExclusionAuthorized` devuelve `false` y el catálogo completo permanece visible.

## Entregas posteriores

La siguiente fase comienza cuando existan candidatos autorizados. La prioridad es la lista `HIGH` de `real-variant-gaps.md`, con al menos tres variantes reales por layout relevante y un holdout separado. Si una fuente no puede anonimizarse de modo verificable, se rechaza; no se rebaja el gate.
