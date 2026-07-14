# Matriz de extractores fiscales

Versión del contrato: `1.0.0`  
Catálogo: `fiscal-document-extractors.2026-07.v2`
Revisión: 2026-07-14

## Regla de lectura

`DEEP_SUPPORTED` significa que el documento puede producir hechos
estructurados revisables cuando contiene campos positivos explícitos. Los 39
tipos del registro están implementados en este nivel. Reconocer un tipo no
garantiza una propuesta: una plantilla, una sección vacía o un dato temporal
insuficiente queda en revisión sin contestar el test.

La coincidencia de NIF no bloquea la lectura. El usuario confirma que los datos
aportados son los que quiere usar. Los NIF se muestran enmascarados y no se
persisten en los hechos del diagnóstico.

## Primer bloque implementado

| Documento                                  | Campos explícitos actuales                                               | Hechos normalizados                                        | Preguntas                          | Alcance              | Confianza               | ¿Omite sin confirmar? |
| ------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------- | -------------------- | ----------------------- | --------------------- |
| Certificado de situación censal            | Tipo, territorio, actividades, IRPF, IVA, fecha, CSV detectado           | `SUBJECT.*`, `ACTIVITY.LIST`, `IRPF.METHOD`, `VAT.REGIMES` | A, B, C, D, E                      | `CURRENT_AS_OF_DATE` | alta con texto nativo   | No                    |
| Mis actividades económicas                 | Epígrafe, descripción, estado y fechas                                   | `ACTIVITY.LIST`, `ACTIVITY.NATURE`, `ACTIVITY.DATES`       | `B_START_DATE`, `C_ACTIVITY_KINDS` | `CURRENT_AS_OF_DATE` | alta/media según método | No                    |
| Mi situación tributaria                    | Casillas marcadas de IRPF e IVA                                          | `IRPF.METHOD`, `VAT.REGIMES`                               | D, E                               | `CURRENT_AS_OF_DATE` | alta/media              | No                    |
| Mis obligaciones                           | Filas inequívocas en alta, lista completa/parcial                        | `CENSUS.PERIODIC_OBLIGATIONS`                              | N y candidatos compatibles         | `CURRENT_AS_OF_DATE` | alta/media              | No                    |
| Modelo 036                                 | Identidad mínima, territorio, actividades, IRPF, IVA, presentación/fecha | hechos anteriores + `CENSUS.EVENT`                         | A, B, C, D, E, N                   | `SPECIFIC_PERIOD`    | media/alta              | No                    |
| Modelo 037 histórico                       | Subconjunto del 036                                                      | hechos anteriores + `CENSUS.EVENT`                         | A, B, C, D, E                      | `HISTORICAL`         | media/alta              | No                    |
| Informe TGSS de situación actual           | Alta explícita en trabajo autónomo y fechas                              | `IRPF.RETA_PERIODS`                                        | `B_RETA`                           | `CURRENT_AS_OF_DATE` | alta/media              | No                    |
| Vida laboral                               | Periodo explícito de trabajo autónomo                                    | `IRPF.RETA_PERIODS`                                        | `B_RETA`                           | `TARGET_FISCAL_YEAR` | alta/media              | No                    |
| Informe de actividades de trabajo autónomo | Actividad autónoma comunicada                                            | `IRPF.RETA_PERIODS`                                        | `B_RETA`                           | `CURRENT_AS_OF_DATE` | alta/media              | No                    |

Una captura parcial puede acreditar un valor positivo visible, pero nunca la
ausencia de otras actividades, regímenes u obligaciones.

La entrada unificada acepta PDF con campos AcroForm, texto nativo o, cuando el
PDF sea solo una imagen, OCR local de hasta 12 páginas. El resultado conserva
la página de origen y el método de extracción; si no hay lectura clara, no se
crean hechos. Las capturas PNG, JPG y WebP usan el mismo pipeline tras OCR local.

## Registro completo de 39 tipos

| Grupo                                 | Tipos                                                                         | Estado           |
| ------------------------------------- | ----------------------------------------------------------------------------- | ---------------- |
| Censales y vistas actuales            | 036, 037, certificado censal, actividades, situación tributaria, obligaciones | `DEEP_SUPPORTED` |
| Seguridad Social prioritario          | situación actual, vida laboral, actividades autónomas                         | `DEEP_SUPPORTED` |
| Retenciones y pagos prioritarios      | 111, 115, 130, 131, 180, 190                                                  | `DEEP_SUPPORTED` |
| IVA prioritario                       | 303, 390                                                                      | `DEEP_SUPPORTED` |
| UE y comercio electrónico prioritario | 035, 349, 369                                                                 | `DEEP_SUPPORTED` |
| Certificado ROI                       | certificado de operador intracomunitario                                      | `DEEP_SUPPORTED` |
| Entidades prioritario                 | 184                                                                           | `DEEP_SUPPORTED` |
| Segunda prioridad                     | 100, 123, 193, 200, 202, 216, 296, 309, 347                                   | `DEEP_SUPPORTED` |
| Casos especiales                      | 151, 308, 341, 714, 720, 721, 840                                             | `DEEP_SUPPORTED` |
| Certificado de arrendador             | exoneración de retención                                                      | `DEEP_SUPPORTED` |

## Segunda prioridad, casos especiales y certificados

| Tipo                      | Hecho positivo mínimo                                             | Propuesta segura                                                                    |
| ------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 100                       | presentación anual; método solo si está marcado                   | método IRPF del ejercicio, sin extrapolarlo                                         |
| 123 / 193                 | perceptor, base, retención o clave anual explícita                | rendimientos de capital sujetos a retención                                         |
| 200                       | copia presentada                                                  | hecho de declaración de la sociedad; no se mezcla con la persona                    |
| 202                       | copia presentada y periodo                                        | pago fraccionado de la sociedad en ese periodo                                      |
| 216 / 296                 | renta, perceptor, base, retención o clave positiva                | pago a no residentes declarado como retenedor                                       |
| 308 / 341                 | devolución o compensación positiva                                | situación especial de IVA del periodo                                               |
| 309                       | adquisición UE o inversión del sujeto pasivo con importe positivo | tipo de operación explícito; nunca obligación periódica 303                         |
| 347                       | registro, clave o importe anual positivo                          | indicio de umbral; nunca responde que todas estén excluidas                         |
| 151                       | copia presentada                                                  | régimen especial en ese ejercicio, sin alterar otras respuestas                     |
| 714                       | copia presentada                                                  | Patrimonio en ese ejercicio                                                         |
| 720 / 721                 | registro o categoría explícita                                    | bienes o cripto en el extranjero en ese ejercicio, sin guardar cuentas ni custodios |
| 840                       | acción, epígrafe y fecha explícitos                               | cambio censal/IAE en esa fecha                                                      |
| Certificado ROI           | afirmación positiva de inclusión                                  | ROI vigente a fecha del certificado, sujeto a confirmación                          |
| Certificado de arrendador | afirmación positiva de exoneración                                | exoneración acreditada, sujeta a vigencia y confirmación                            |

## Mapeos que quedan expresamente prohibidos

- 349 no implica alta actual en ROI.
- 369 no implica registro OSS/IOSS actual.
- 303 no implica obligación futura ni modelo 390.
- 111 no implica empleados sin distinguir claves/perceptores.
- 115/180 históricos no acreditan que el alquiler continúe.
- 037 nunca se usa por sí solo como situación actual.
- La ausencia de documento o de una fila nunca responde «No».

## Máxima prioridad implementada en v2

| Modelo | Hechos estructurados                                                                  | Propuestas seguras                                                                                                              |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 035    | causa, régimen y fecha efectiva                                                       | `J_OSS=YES` solo para un alta explícita; una baja no genera `NO`                                                                |
| 111    | perceptores de trabajo, actividad económica y otras categorías por casillas positivas | otras retenciones explícitas; no convierte perceptores de trabajo en empleados ni actividad económica agregada en profesionales |
| 115    | perceptor, base o retención positiva por alquiler urbano                              | alquiler y retención, limitados al periodo                                                                                      |
| 130    | pago fraccionado en estimación directa                                                | no distingue normal/simplificada y no responde esa pregunta                                                                     |
| 131    | pago fraccionado en estimación objetiva                                               | estimación objetiva, limitada al periodo                                                                                        |
| 180    | perceptor, base o retención anual positiva de alquileres                              | alquiler y retención, limitados al ejercicio                                                                                    |
| 184    | entidad en atribución, actividad o rentas explícitas                                  | umbral/actividad solo con campo positivo explícito                                                                              |
| 190    | claves y subclaves de percepción                                                      | trabajo, profesional u otras categorías según clave                                                                             |
| 303    | régimen marcado/casillas positivas e inversión del sujeto pasivo                      | IVA e inversión solo con contenido explícito; los títulos vacíos no cuentan                                                     |
| 349    | claves exactas `E/A/S/I`                                                              | cuatro tipos de operación UE; nunca ROI                                                                                         |
| 369    | régimen y operaciones OSS/IOSS del periodo                                            | ventas a consumidores UE; nunca vigencia actual del registro                                                                    |
| 390    | regímenes con marcas o importes positivos y resumen anual                             | regímenes explícitos; presentar 390 no responde por sí solo la exoneración                                                      |

Todos conservan modelo, ejercicio, periodo, página, campo/casilla, método de
lectura, confianza y estado de presentación aparente. Una plantilla, un
borrador, una casilla a cero o una sección vacía no genera respuestas.
