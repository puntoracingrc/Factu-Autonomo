# Métricas y gates de liberación

El informe se agrega por familia, layout y ejercicio: precisión y errores de clasificación, exactitud crítica/no crítica, tasa de revisión, inferencias prohibidas, preguntas críticas omitidas, fallos parser/OCR y tiempo medio.

| Gate                                         | Umbral |
| -------------------------------------------- | -----: |
| Falsos positivos críticos                    |      0 |
| Inferencias prohibidas                       |      0 |
| Preguntas críticas omitidas incorrectamente  |      0 |
| Layout desconocido autoconfirmado            |      0 |
| Exclusión con ruleset pendiente              |      0 |
| Exactitud de clasificación en aceptación     |  100 % |
| Exactitud de campos críticos autoconfirmados |  100 % |

El porcentaje de campos no críticos y la tasa de revisión se muestran, pero no permiten compensar un fallo crítico. Una suite sin muestras no supera el gate. Las métricas sintéticas no cambian `SYNTHETIC_ONLY` ni `REAL_VARIANT_GAP`.

El script `npm run fixtures:tax-real-variants:validate` informa únicamente recuentos públicos. `npm run fixtures:tax-real-variants:require-real` está destinado a un gate privado y falla mientras falte una variante real o holdout para cualquiera de las 39 familias.
