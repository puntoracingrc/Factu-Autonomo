# Política de confianza

## Orden de métodos

1. Fichero oficial estructurado.
2. AcroForm o XFA.
3. Texto PDF nativo.
4. Texto con estructura y posición relativa.
5. OCR local.
6. Revisión humana.

El registro usa `STRICT_EXPLICIT_FIELD`: un número de modelo, una profesión o
una frase libre no bastan para decidir una obligación. Deben coincidir el tipo
documental, las etiquetas/casillas y una estructura admitida.

## Umbrales

- `>= 0.85`: propuesta revisable de texto nativo o campo estructurado.
- `0.70–0.84`: propuesta revisable que siempre exige confirmación.
- `< 0.70`: el hecho queda marcado para revisión y nunca completa una pregunta.
- Conflicto, documento parcial, borrador o periodo histórico: nunca omite una
  pregunta sin confirmación, con independencia de la puntuación.

La interfaz mantiene las preguntas visibles. `canSkipQuestion` significa
«contestada y revisable», no «oculta».

## Presentación y CSV

La presencia impresa de CSV, justificante o fecha permite como máximo
`APPARENTLY_FILED`. `CSV_VERIFIED` solo puede emitirse después de un cotejo
oficial; el extractor local actual emite únicamente `CSV_DETECTED`.
