# Matriz de extractores fiscales

Versión del contrato: `1.0.0`  
Catálogo: `fiscal-document-extractors.2026-07.v1`  
Revisión: 2026-07-14

## Regla de lectura

`DEEP_SUPPORTED` significa que el documento puede producir hechos
estructurados revisables. `CLASSIFICATION_ONLY` significa que el tipo se puede
identificar, pero el resultado obligatorio es `UNSUPPORTED_DOCUMENT`, sin
hechos ni respuestas propuestas.

La coincidencia de NIF no bloquea la lectura. El usuario confirma que los datos
aportados son los que quiere usar. Los NIF se muestran enmascarados y no se
persisten en los hechos del diagnóstico.

## Primer bloque implementado

| Documento | Campos explícitos actuales | Hechos normalizados | Preguntas | Alcance | Confianza | ¿Omite sin confirmar? |
|---|---|---|---|---|---|---|
| Certificado de situación censal | Tipo, territorio, actividades, IRPF, IVA, fecha, CSV detectado | `SUBJECT.*`, `ACTIVITY.LIST`, `IRPF.METHOD`, `VAT.REGIMES` | A, B, C, D, E | `CURRENT_AS_OF_DATE` | alta con texto nativo | No |
| Mis actividades económicas | Epígrafe, descripción, estado y fechas | `ACTIVITY.LIST`, `ACTIVITY.NATURE`, `ACTIVITY.DATES` | `B_START_DATE`, `C_ACTIVITY_KINDS` | `CURRENT_AS_OF_DATE` | alta/media según método | No |
| Mi situación tributaria | Casillas marcadas de IRPF e IVA | `IRPF.METHOD`, `VAT.REGIMES` | D, E | `CURRENT_AS_OF_DATE` | alta/media | No |
| Mis obligaciones | Filas inequívocas en alta, lista completa/parcial | `CENSUS.PERIODIC_OBLIGATIONS` | N y candidatos compatibles | `CURRENT_AS_OF_DATE` | alta/media | No |
| Modelo 036 | Identidad mínima, territorio, actividades, IRPF, IVA, presentación/fecha | hechos anteriores + `CENSUS.EVENT` | A, B, C, D, E, N | `SPECIFIC_PERIOD` | media/alta | No |
| Modelo 037 histórico | Subconjunto del 036 | hechos anteriores + `CENSUS.EVENT` | A, B, C, D, E | `HISTORICAL` | media/alta | No |
| Informe TGSS de situación actual | Alta explícita en trabajo autónomo y fechas | `IRPF.RETA_PERIODS` | `B_RETA` | `CURRENT_AS_OF_DATE` | alta/media | No |
| Vida laboral | Periodo explícito de trabajo autónomo | `IRPF.RETA_PERIODS` | `B_RETA` | `TARGET_FISCAL_YEAR` | alta/media | No |
| Informe de actividades de trabajo autónomo | Actividad autónoma comunicada | `IRPF.RETA_PERIODS` | `B_RETA` | `CURRENT_AS_OF_DATE` | alta/media | No |

Una captura parcial puede acreditar un valor positivo visible, pero nunca la
ausencia de otras actividades, regímenes u obligaciones.

La entrada unificada acepta PDF con campos AcroForm, texto nativo o, cuando el
PDF sea solo una imagen, OCR local de hasta 12 páginas. El resultado conserva
la página de origen y el método de extracción; si no hay lectura clara, no se
crean hechos. Las capturas PNG, JPG y WebP usan el mismo pipeline tras OCR local.

## Registro completo de 39 tipos

| Grupo | Tipos | Estado |
|---|---|---|
| Censales y vistas actuales | 036, 037, certificado censal, actividades, situación tributaria, obligaciones | `DEEP_SUPPORTED` |
| Seguridad Social prioritario | situación actual, vida laboral, actividades autónomas | `DEEP_SUPPORTED` |
| Retenciones y pagos prioritarios | 111, 115, 130, 131, 180, 190 | `CLASSIFICATION_ONLY` |
| IVA prioritario | 303, 390 | `CLASSIFICATION_ONLY` |
| UE y comercio electrónico prioritario | 035, 349, 369, certificado ROI | `CLASSIFICATION_ONLY` |
| Entidades prioritario | 184 | `CLASSIFICATION_ONLY` |
| Segunda prioridad | 100, 123, 193, 200, 202, 216, 296, 309, 347 | `CLASSIFICATION_ONLY` |
| Casos especiales | 151, 308, 341, 714, 720, 721, 840 | `CLASSIFICATION_ONLY` |
| Certificado de arrendador | exoneración de retención | `CLASSIFICATION_ONLY` |

## Mapeos que quedan expresamente prohibidos

- 349 no implica alta actual en ROI.
- 369 no implica registro OSS/IOSS actual.
- 303 no implica obligación futura ni modelo 390.
- 111 no implica empleados sin distinguir claves/perceptores.
- 115/180 históricos no acreditan que el alquiler continúe.
- 037 nunca se usa por sí solo como situación actual.
- La ausencia de documento o de una fila nunca responde «No».
