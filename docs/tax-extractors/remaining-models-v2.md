# Extractores restantes v2

Revisión: 2026-07-14
Contrato: `1.0.0`
Catálogo: `fiscal-document-extractors.2026-07.v2`
Clasificador: `fiscal-document-classifier.2026-07.v2`

## Cobertura

Este bloque completa la lectura profunda de `100`, `123`, `151`, `193`,
`200`, `202`, `216`, `296`, `308`, `309`, `341`, `347`, `714`, `720`, `721`
y `840`, además de los certificados ROI y de exoneración de retención del
arrendador.

Cada definición pública reserva detectores, campos, etiquetas, tipo de dato,
alcance temporal, preguntas compatibles, fuentes oficiales y política de
retención. Los resultados usan el mismo sobre versionado y trazable que el
primer bloque.

## Reglas cerradas

- El NIF no tiene que coincidir con el perfil y nunca bloquea la lectura.
- Solo una copia con señales de presentación y tiempo suficiente genera
  hechos de una declaración.
- Una casilla a cero, un título impreso o una tabla vacía no son evidencia
  positiva.
- `111/190`, `115/180`, `123/193`, `216/296` y `303/390` convergen en hechos o
  campos comunes; si sus propuestas discrepan, la interfaz no aplica ninguna
  automáticamente y muestra el conflicto.
- `347` puede proponer que existe evidencia anual de umbral, pero no que todas
  las operaciones están excluidas.
- `309` puede acreditar una adquisición intracomunitaria o inversión del
  sujeto pasivo, pero no una obligación periódica de IVA.
- `720`, `721`, `193`, `296` y `347` no conservan identidades de terceros,
  cuentas, custodios, direcciones ni importes nominativos.
- Toda propuesta se muestra en verde, continúa editable y exige confirmación
  expresa antes de modificar el test.

## Verificación sintética

La batería cubre los 16 modelos y los 2 certificados con casos positivos,
ceros, documentos sin afirmación positiva, falta de NIF, trazabilidad,
periodos y confirmación obligatoria. El registro también comprueba que los 39
tipos están en `DEEP_SUPPORTED` y que todos los mapeos usan preguntas
canónicas.
