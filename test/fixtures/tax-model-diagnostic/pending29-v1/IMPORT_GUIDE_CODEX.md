# Guía de importación para Codex

1. Importa primero `corpus-manifest.json`.
2. Registra cada `documentType` como familia ya conocida por el extractor.
3. Ejecuta clasificación sobre los 348 PDF.
4. Para PDF nativos, compara `expectedFields` y `fieldEvidence`.
5. Para variantes rasterizadas, ejecuta OCR y compara la misma verdad semántica.
6. Los casos `REVIEW_OR_REJECT` no deben generar respuestas seguras ni omitir preguntas del test.
7. Valida `mustNotInfer` como pruebas negativas obligatorias.
8. No ajustes un extractor para un fixture sin añadir una prueba de regresión para las otras variantes de la familia.

La ruta del PDF está en `pdfFile`; la relación entre visuales se realiza mediante `baseFixtureId`.
