# Informe de cobertura y métricas por familia

La fuente ejecutable del inventario es `CURRENT_CORPUS_INVENTORY`; la del informe de ejecución es `summarizeRealVariantMetricsByGroup`. Agrupa sin red ni reloj por familia, layout y ejercicio.

## Foto inicial

| Grupo                 | Familias | Manifiestos sintéticos | Real anonimizado | Holdout | Métrica real | Estado           |
| --------------------- | -------: | ---------------------: | ---------------: | ------: | ------------ | ---------------- |
| Modelos numerados     |       30 |                    348 |                0 |       0 | N/D          | REAL_VARIANT_GAP |
| Documentos sin número |        9 |                     41 |                0 |       0 | N/D          | REAL_VARIANT_GAP |
| Total                 |       39 |                    389 |                0 |       0 | N/D          | REAL_VARIANT_GAP |

No se publica un porcentaje de precisión real cuando el denominador es cero. Los resultados del corpus sintético se conservan como regresión técnica y no rellenan la columna real.

Cada incorporación generará filas con: `sampleCount`, exactitud de clasificación, exactitud crítica/no crítica, tasa de revisión, inferencias prohibidas, preguntas críticas omitidas incorrectamente, fallos parser/OCR, tiempo medio y `releaseGatePassed`. Una fila con cero muestras nunca supera el gate.

La matriz de 39 familias y layouts está en `layout-version-matrix.md`; las prioridades de adquisición están en `real-variant-gaps.md`.
