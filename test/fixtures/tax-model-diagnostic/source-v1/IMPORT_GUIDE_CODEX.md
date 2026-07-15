# Guía de incorporación en Codex

## Estado del paquete

- 41 PDF base generados.
- 41 manifiestos JSON.
- Validación estructural: 41/41.
- Todos los documentos son sintéticos y están marcados como no presentables.

## Incorporación recomendada

1. Copiar `pdfs/` al directorio de fixtures del proyecto.
2. Copiar o transformar `manifests/` al esquema interno del validador.
3. Utilizar `fixtureId` como identificador estable.
4. Verificar el SHA-256 antes de admitir cada PDF.
5. Ejecutar por separado:
   - clasificación documental;
   - extracción de campos;
   - normalización;
   - mapeo a preguntas;
   - comprobación de `mustNotInfer`.
6. No considerar estos PDF una prueba de compatibilidad con el servicio oficial de presentación.

## Criterio para admitir un fixture

Un fixture se considera admitido cuando:

- El clasificador identifica correctamente `documentType`.
- El recuento de páginas coincide.
- Los campos de `fieldEvidence` se extraen con el valor esperado.
- No se generan inferencias incluidas en `mustNotInfer`.
- La identidad sintética coincide con el manifiesto.
- La extracción conserva página y etiqueta de procedencia.

## Diferencias respecto a documentos oficiales presentados

- Los formularios se han construido sobre layouts oficiales, pero no se han enviado ni validado en la sede de la AEAT.
- Las pantallas censales son simulaciones funcionales.
- Algunos layouts impresos proceden de anexos oficiales históricos y deben etiquetarse por versión.
- Las variantes OCR deben generarse a partir de estos PDF base en una fase posterior.

## Estructura de un manifiesto

- `expectedFields`: verdad semántica completa del caso.
- `fieldEvidence`: campos mínimos con página y etiqueta esperadas.
- `expectedQuestionMappings`: respuestas que el documento puede proponer.
- `mustNotInfer`: conclusiones que el motor tiene prohibido producir.
- `sourceTemplate`: procedencia y condición del layout.
- `sha256`: integridad del PDF.

## Orden de pruebas

1. PDF nativo.
2. PDF rasterizado a 200 ppp.
3. PDF rasterizado a 120 ppp.
4. Giro de ±2 grados.
5. Compresión JPEG.
6. Fotografía con perspectiva.
7. Página ausente o desordenada.

No modificar el PDF base. Cada degradación debe tener un identificador derivado y conservar la relación con el fixture original.
