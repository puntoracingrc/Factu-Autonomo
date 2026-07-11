# Fixtures privados opcionales

La suite completa no depende de rutas personales ni intenta abrir archivos privados por defecto.
Los contratos, parsers y fixtures sintéticos siguen ejecutándose en cualquier checkout limpio.

Para activar localmente las pruebas de integración con archivos privados, configura una o ambas
variables antes de ejecutar `npm test`:

- `STIL_CONDAL_FIXTURE_PDF`: ruta absoluta o relativa al PDF privado de STIL.
- `STIL_CONDAL_GROUND_TRUTH_JSON`: JSON esperado privado correspondiente; se
  configura siempre junto a `STIL_CONDAL_FIXTURE_PDF`.
- `COMPETITOR_IMPORT_FIXTURES_ROOT`: raíz con
  `exports/facturadirecta/` y `exports/holded/holded-synthetic-export-v1.xlsx`.
- `INVOICE_REAL_QA_EXTERNAL_ROOT`: dataset externo usado por los comandos
  `real:qa:external:*`; también se puede pasar la ruta como argumento.

Configurar una variable es un opt-in explícito: si la ruta o alguno de sus archivos no se puede
leer, la prueba correspondiente falla en lugar de quedar omitida. Los archivos privados continúan
fuera del repositorio y no deben añadirse a Git.
