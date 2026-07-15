# Corpus sintético ampliado - 29 familias pendientes

Este paquete amplía el corpus del motor de perfil fiscal con las **29 familias que no estaban cubiertas**.

## Volumen

- Familias: **29**
- Casos semánticos por familia: **4**
- PDF base nativos: **116**
- Variantes visuales por base: **2** adicionales
- PDF totales: **348**

Cada familia contiene:

1. Caso habitual positivo.
2. Caso negativo, vacío o de resultado cero.
3. Caso complejo, complementario o con varios registros.
4. Caso incompleto o ambiguo que debe pasar a revisión o rechazo.

Cada caso semántico se entrega como:

- PDF con capa de texto nativa.
- Escaneo rasterizado y comprimido.
- Captura rasterizada ligeramente girada.

## Advertencias

- Ningún documento procede de un contribuyente real.
- Ningún PDF ha sido presentado, validado o generado por el servicio vivo de la AEAT o la TGSS.
- Son facsímiles sintéticos basados en nombres de campos, instrucciones, diseños de registro y descripciones oficiales.
- Todos muestran la marca **DOCUMENTO SINTÉTICO - SIN VALIDEZ - NO PRESENTABLE**.
- Los casos vacíos de modelos como 720 y 721 están etiquetados como borradores; no permiten inferir que no existe obligación.

## Estructura

- `pdfs/native/`: 116 PDF base con texto nativo.
- `pdfs/scan_compressed/`: degradaciones OCR rasterizadas.
- `pdfs/rotated_capture/`: capturas rasterizadas y giradas.
- `manifests/`: verdad esperada individual para los 348 PDF.
- `corpus-manifest.json`: índice completo.
- `corpus-inventory.csv`: inventario tabular.
- `family-coverage.csv`: matriz de cobertura.
- `VALIDATION_REPORT.md`: validación estructural y visual.
- `qa/QA_MONTAGE_29_FAMILIES.jpg`: control visual de una muestra por familia.
- `tools/`: generador y validador reproducibles.

## Integración

El campo `expectedDisposition` diferencia:

- `ACCEPT_WITH_SYNTHETIC_LIMITATION`: el lector debe poder clasificar y extraer los campos esperados.
- `REVIEW_OR_REJECT`: el lector debe detectar que faltan datos o páginas y no cerrar preguntas críticas.

`mustNotInfer` contiene las conclusiones que el sistema tiene prohibido producir a partir del documento.
