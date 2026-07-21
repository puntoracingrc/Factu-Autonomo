# ADR-0008: Motor local de lectura y aprendizaje de gastos

- Estado: aceptado para implementación incremental
- Fecha: 2026-07-21
- Ámbito: lectura de facturas y tickets recibidos, modo sombra, aprendizaje estructural y métricas agregadas

## Contexto

El escáner de gastos actual usa un proveedor de IA en cada análisis. Ya existen tres activos que deben converger sin duplicarse:

1. El flujo de Gastos, que propone datos y exige revisión antes de guardar.
2. Un lector local maduro en Notificaciones, con límites, PDF.js, OCR local, abortos, integridad y contenido efímero.
3. Un corpus sintético de facturas y un benchmark determinista. La línea base del 21 de julio de 2026 procesó 403 fixtures sintéticas sin IA y sin fallos.

Ese 100 % no demuestra precisión universal: el corpus es generado y puede compartir supuestos con el parser. Sirve como regresión y punto de partida, no como autorización para aceptar facturas reales sin revisión.

El aprendizaje anterior de Admin (`ai_learning_events`) está limitado a cuentas concretas y conserva identidad de cuenta y rasgos de negocio. No cumple la frontera de privacidad de este motor y no se reutilizará.

## Decisión

### Separación de dominios

Se crea una capa neutral `document-reading` para mecánica de lectura y una capa `expense-engine` para semántica de gastos. Notificaciones conserva intactas sus familias, reglas, hechos, plazos, relaciones, estados y persistencia fiscal.

La migración del lector será gradual:

1. Fase 0: PDF digital en modo sombra mediante compatibilidad explícita con el parser de capa de texto actual. Imágenes y PDF sin texto se abstienen.
2. Fase 1: extracción neutral de PDF/OCR solo después de demostrar paridad completa en Notificaciones.
3. Fase 2: activación parcial del motor local de gastos únicamente en estructuras que superen los gates versionados.

### Modo sombra

El motor local corre antes o junto a la lectura IA, pero inicialmente no sustituye el resultado visible, no guarda gastos y no evita llamadas. Se comparan tres salidas:

- propuesta local;
- propuesta IA;
- resultado confirmado o corregido por la persona usuaria.

La confirmación humana convierte los campos de ese documento en verdad operativa para evaluar el ejemplo. No convierte automáticamente las hipótesis de estructura o fórmula de la IA en reglas activas.

### Contrato IA

La misma llamada que hoy extrae el gasto podrá devolver un envelope interno con:

- `expense`: contrato visible actual, sin cambios para consumidores;
- `learningHints`: DSL cerrada de regiones, roles de columnas, unidades, signos, fórmulas, redondeo y confianza.

No se hará una segunda llamada para aprendizaje. Los hints inválidos se descartan completos sin invalidar un gasto legible. El navegador, la API pública y el buzón siguen recibiendo solo el gasto.

### Aprendizaje permitido

El motor puede acumular únicamente señales categóricas y agregables:

- arquetipo estructural;
- orden de regiones y roles de columnas;
- fórmulas de una lista cerrada;
- unidades, signos, redondeo y buckets de confianza;
- veredictos por campo;
- conciliación matemática por estado y bucket de diferencia;
- abstenciones, fallback IA y flags críticos.

Se prohíben PDF, imagen, OCR o texto bruto, cabeceras libres, nombre de archivo, proveedor, usuario, email, NIF, dirección, cuenta bancaria, número de factura, IDs opacos, hashes del documento e importes o porcentajes exactos.

La autenticación puede autorizar y limitar la aportación, pero la identidad no se almacena en la observación. La persistencia será agregada por periodo, versión y arquetipo; no habrá historial por documento o persona. Las celdas con soporte insuficiente permanecerán ocultas y nunca activarán reglas.

El consentimiento para enviar un documento a IA y la contribución para mejorar el motor son finalidades distintas. La contribución requerirá información específica y una decisión separada antes de persistir cualquier observación.

### Matemática

La IA propone una fórmula solo como enum de la DSL. El motor determinista la contrasta en memoria con los valores confirmados:

- extensión de línea;
- suma de líneas contra base;
- IVA y recargo desde base;
- total del documento;
- coherencia de signo para abonos.

Datos ausentes producen `INSUFFICIENT`, nunca cero. Se reutiliza la tolerancia monetaria vigente del dominio de Gastos. Las observaciones persistibles contienen solo `MATCH`, `MISMATCH` o `INSUFFICIENT` y un bucket de diferencia, nunca los operandos.

### Promoción de reglas

Una regla nueva empieza como candidata y permanece en sombra. Solo puede activarse mediante una política versionada que exija soporte diverso, holdout no usado para crear la regla, ausencia de regresiones críticas y posibilidad de rollback. La IA y una sola confirmación humana no pueden promoverla por sí solas.

### Admin

Admin mostrará métricas agregadas por versión, arquetipo y periodo: cobertura local, exactitud por campo, reconciliación matemática, fallback IA, coste evitado, abstenciones, falsos positivos críticos y evolución. No habrá vistas por proveedor, usuario o documento.

## Consecuencias

- Durante el modo sombra el coste de IA no baja todavía; obtenemos una línea base comparable sin arriesgar guardados.
- Añadir hints a la respuesta existente aumenta algo la salida, pero no crea otra llamada ni otra unidad de cuota.
- PDF digital aportará valor antes que imágenes; el OCR neutral se incorpora después de demostrar que Notificaciones conserva paridad.
- El corpus sintético existente se divide en desarrollo, validación y holdout para evitar medir con los mismos ejemplos que moldean las reglas.
- Cualquier fallo de límites, OCR, estructura, matemática o política termina en abstención y revisión humana.

## Sistemas fuera de alcance

Este ADR no modifica documentos emitidos, VeriFactu, snapshots, sellos, fiscal notifications, Drive, sincronización cloud, billing, asientos, declaraciones ni deducibilidad automática.
