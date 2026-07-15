# Corpus sintético de las 29 familias pendientes

Revisión: 2026-07-15  
Estado del corpus: `VALIDATED_SYNTHETIC_CORPUS_EXTENSION`  
Esquema de manifiesto: `2.0`

## Alcance incorporado

El paquete `pending29-v1` registra 29 familias documentales con cuatro
escenarios semánticos por familia y tres variantes visuales por escenario:

- 116 PDF con capa de texto nativa;
- 116 escaneados y comprimidos;
- 116 capturas rasterizadas y giradas;
- 348 PDF y 348 manifiestos individuales en total.

Cada manifiesto declara la clasificación esperada, los campos que pueden
leerse, la página y etiqueta de procedencia, las preguntas compatibles y las
inferencias expresamente prohibidas. El registro de la aplicación traduce cada
familia externa a un único `FiscalDocumentType` canónico.

## Verificación reproducible

```bash
npm run fixtures:tax-corpus:pending29:validate
npm run fixtures:tax-corpus:pending29:native-text
npm run fixtures:tax-corpus:pending29:ocr-text
npx vitest run src/lib/tax-model-diagnostic/pending29-corpus.test.ts
```

La prueba de aceptación comprueba:

- las 348 clasificaciones;
- los campos declarados de los 116 documentos nativos;
- contraste de tokens y clasificación en los 232 documentos OCR;
- las 348 políticas `mustNotInfer`;
- revisión o rechazo de todo caso `incomplete_ambiguous`;
- tratamiento inconcluso de los borradores vacíos 720 y 721.

Las transcripciones OCR se generan localmente, página a página, con el mismo
lector `pdf.js` + Tesseract usado por la web. Se conserva una primera pasada
automática y una segunda pasada de texto disperso; la aplicación compara y
combina ambas sin enviar el documento a un servicio remoto.

## Límites de seguridad

Todos los archivos llevan la marca `DOCUMENTO SINTÉTICO · SIN VALIDEZ` o su
equivalente. Ninguno acredita una presentación, una respuesta de la sede viva
de AEAT/TGSS ni una obligación fiscal actual. Por ello:

- el motor nunca marca estos fixtures como presentación oficial verificada;
- los hechos visibles requieren confirmación humana;
- una sección vacía no se convierte en una respuesta negativa;
- un documento incompleto puede conservar datos legibles, pero no cerrar una
  pregunta crítica;
- 349 no prueba ROI actual, 035 no prueba operaciones OSS/IOSS y 720/721 vacíos
  no prueban ausencia de obligación;
- la aprobación fiscal del ruleset es independiente de esta validación
  técnica y permanece en su estado propio.

Cuando existan documentos reales anonimizados de AEAT/TGSS se incorporarán en
una capa de validación separada, con inventario y métricas distintos. No se
mezclarán con este corpus sintético ni se usarán para cambiar su resultado.
