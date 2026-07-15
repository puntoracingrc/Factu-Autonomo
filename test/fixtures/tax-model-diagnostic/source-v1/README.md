# Corpus sintético de documentos para el motor de perfil fiscal

Este paquete contiene **41 PDF base sintéticos** y sus manifiestos JSON.

## Advertencia

- Ningún PDF es una declaración real ni ha sido validado o presentado ante la AEAT.
- Todos llevan la marca visible **DOCUMENTO SINTÉTICO · SIN VALIDEZ**.
- Los NIF, nombres, importes, fechas y referencias se han generado exclusivamente para pruebas.
- Las pantallas de “Mis datos censales” son simulaciones funcionales, no capturas oficiales.
- Los formularios utilizan layouts oficiales publicados por AEAT/BOE como fondo cuando se dispone de ellos; la capa cumplimentada es sintética.

## Contenido

- 5 variantes del modelo 036.
- 3 variantes históricas del modelo 037.
- 4 variantes del modelo 130.
- 5 variantes del modelo 303.
- 4 variantes del modelo 390.
- 4 variantes del modelo 111.
- 4 variantes del modelo 115.
- 4 simulaciones de “Mis actividades económicas”.
- 4 simulaciones de “Mi situación tributaria”.
- 4 simulaciones de “Mis obligaciones tributarias”.

## Estructura

- `pdfs/`: documentos base.
- `manifests/`: verdad esperada, evidencias y prohibiciones de inferencia.
- `corpus-manifest.json`: inventario completo y huellas SHA-256.
- `corpus-inventory.csv`: inventario tabular.
- `VALIDATION_REPORT.md`: resultado del validador.

## Uso recomendado

1. Clasificar el PDF.
2. Extraer los campos.
3. Compararlos con `expectedFields` y `fieldEvidence`.
4. Comprobar `mustNotInfer`.
5. Generar degradaciones visuales a partir del PDF base para pruebas OCR.

## Alcance

El corpus sirve para desarrollo, regresión y contraste inicial. No sustituye la validación posterior con documentos reales debidamente autorizados y anonimizados.
