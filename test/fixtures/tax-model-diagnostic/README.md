# Corpus del motor de perfil fiscal

Este directorio reserva el corpus contrastado de los extractores fiscales. El
contrato público es `fiscal-extractor-corpus.2026-07.v1` y su esquema está en
`manifest.schema.json`.

## Alcance inicial

El plan canónico vive en
`src/lib/tax-model-diagnostic/corpus.ts` y contiene exactamente 41 casos
semánticos:

| Documento                  | Casos base |
| -------------------------- | ---------: |
| Modelo 036                 |          5 |
| Modelo 037 histórico       |          3 |
| Modelo 130                 |          4 |
| Modelo 303                 |          5 |
| Modelo 390                 |          4 |
| Modelo 111                 |          4 |
| Modelo 115                 |          4 |
| Mis actividades económicas |          4 |
| Mi situación tributaria    |          4 |
| Mis obligaciones           |          4 |

Cada caso exige al menos tres variantes visuales. El plan completo reserva más
de cien ejecuciones sin necesitar cien contribuyentes diferentes.

## Estructura reservada

```text
tax-model-diagnostic/
  manifest.schema.json
  manifests/       # un JSON por PDF o captura derivada
  pdf/             # documentos sintéticos o irreversiblemente anonimizados
  text/            # capa de texto esperada, cuando exista
  rendered/        # PNG de control visual; no se versiona con datos reales
```

Los directorios de assets se crean al incorporar el primer caso aprobado. Un
manifiesto nunca puede apuntar fuera de este árbol.

## Reglas de admisión

1. Preferir formularios oficiales cumplimentados con datos completamente
   sintéticos.
2. Un documento real necesita autorización y anonimización irreversible.
3. No se admite ocultar texto colocando un rectángulo encima.
4. El manifiesto debe declarar todos los campos esperados con página y etiqueta.
5. Debe declarar también las preguntas que puede proponer y las inferencias
   prohibidas.
6. Cada caso sintético debe identificar la versión del formulario o vista y la
   URL oficial contrastada, su fecha de captura y, cuando exista, la huella de
   la plantilla oficial.
7. El PDF y el manifiesto comparten una huella SHA-256.
8. El nombre original nunca se conserva en el corpus ni en el informe de
   auditoría.
9. Ninguna regla del extractor se ajusta sin añadir o actualizar una regresión.

El modelo 037 siempre lleva `HISTORICAL_DOCUMENT` y
`NOT_CURRENT_CENSUS_STATUS`. Un 036 de modificación puede ser un documento
completo y, aun así, cubrir solamente el cambio declarado; nunca se trata como
fotografía censal completa. Una captura parcial no permite inferir ausencias.

## Comandos

Validar esquema, rutas y huellas de los manifiestos presentes:

```bash
npm run fixtures:tax-corpus:validate
```

Exigir además que el corpus ya contenga assets:

```bash
npm run fixtures:tax-corpus:validate-complete
```

Este segundo comando no se limita a comprobar que exista algún archivo: exige
los 41 casos semánticos, los recuentos exactos por documento, un único original
por caso y todas las variantes visuales obligatorias. Por tanto, un corpus vacío
o poblado parcialmente nunca produce un falso verde.

Auditar un candidato real sin imprimir nombres ni valores encontrados:

```bash
npm run fixtures:tax-corpus:audit-pdf -- documento.pdf \
  --sensitive-values-file /ruta/privada/valores-originales.txt
```

La auditoría falla de forma cerrada hasta que una persona revise visualmente
los QR y códigos de barras y añada `--qr-barcode-reviewed`. El fichero privado
de valores originales nunca se copia al repositorio.

Generar degradaciones visuales deterministas:

```bash
npm run fixtures:tax-corpus:visual-variants -- \
  documento-base.pdf test/fixtures/tax-model-diagnostic/pdf \
  m303-quarterly-to-pay-001
```

El generador produce PDF escaneado, baja resolución, giro leve y fotografía
simulada, además de un JSON que conserva el identificador semántico y las
huellas de cada derivado.

## Métricas y condiciones de fallo

La evaluación separa clasificación, extracción, normalización, mapeo a
preguntas, falsos positivos e inferencias prohibidas. La suite falla cuando:

- falta un campo esperado;
- aparece un campo inexistente;
- página, etiqueta o normalización no coinciden;
- una captura parcial se trata como completa;
- un 036 de modificación se convierte en estado censal completo;
- un 037 o declaración histórica responde una pregunta actual;
- una inferencia prohibida aparece en el resultado;
- evidencia OCR con confianza inferior a 0,70 permite omitir una pregunta.

Las comparaciones PDF nativo frente a OCR deben agruparse mediante
`semanticCaseId` y `parentFixtureId`, nunca por el nombre original del archivo.
