# Cuestionario, reglas y documentos

## Árbol de preguntas

| Bloque | Contenido | Decisiones principales |
| --- | --- | --- |
| A | Quién factura y relación con la actividad | Persona, sociedad, entidad y actividad personal adicional |
| B | Ejercicio, territorio, fechas y RETA | Ruleset, puerta territorial, períodos y modelo 100 |
| C | Tipos de actividad | Profesional, empresarial, agraria, ganadera o forestal |
| D | IRPF | Estimación directa, módulos y excepción del 70 % |
| E | IVA | Régimen, 303/309/390, REDEME, SII y supuestos especiales |
| F | Empleados y profesionales pagados | 111 y 190 |
| G | Alquileres | 115/180 y exoneraciones acreditadas |
| H | Capital y no residentes | 123/193 y 216/296 |
| I | Operaciones UE B2B | ROI, 349, 303/309 y discrepancias |
| J | Ventas B2C europeas | 035 y 369 OSS/IOSS |
| K | Operaciones con terceros | Umbral y exclusiones del 347 |
| L | Sociedades y atribución | 184, 200 y 202 |
| M | Obligaciones personales | 714, 720 y 721, siempre separadas de la actividad |
| N | Cambios y censo | 036 y reconciliación de obligaciones periódicas |

Cada pregunta declara explicación, motivo, ejemplo, documento útil, modelos afectados y condición de aplicabilidad. El catálogo canónico está en `src/lib/tax-model-diagnostic/questions.ts`.

## Reglas críticas de decisión

- El territorio se resuelve antes que cualquier modelo. Un territorio desconocido o no soportado impide emitir la lista.
- El modelo 100 se analiza para la persona física y tiene en cuenta cualquier período confirmado de alta en RETA dentro del ejercicio.
- La excepción del 70 % solo se evalúa en las clases de actividad admitidas. Una mezcla con actividad empresarial no hereda la excepción profesional.
- ROI sin operaciones no genera 349. Operaciones UE sin alta efectiva confirmada producen discrepancia o revisión.
- Una factura extranjera no genera automáticamente 216/296.
- Presentar 303 no implica automáticamente presentar 390; SII y exoneraciones se preguntan por separado.
- Superar el umbral por tercero no basta para 347; también se comprueban SII y operaciones excluidas.
- Ser autónomo societario no atribuye a la persona los modelos de la sociedad. Si además existe actividad personal, ambos sujetos se muestran por separado.
- Los modelos 308, 341, 714, 720 y 721 se mantienen en revisión hasta disponer de los datos específicos de sus supuestos y umbrales.

## Catálogo documental

| Documento | Uso actual | Extracción | Confirmación |
| --- | --- | --- | --- |
| Certificado de situación censal AEAT | Identidad, sujeto, territorio, IRPF, IVA y confirmación de censo revisado | Texto nativo local | Obligatoria por campo |
| Modelo 036 | Propuesta de sujeto, territorio y regímenes; puede no reflejar el estado actual | Texto nativo local | Obligatoria, incluida vigencia |
| Situación RETA/vida laboral | Fechas de alta para modelo 100 | Manual | Obligatoria |
| Libros de facturas y retenciones | Porcentaje del 70 %, pagadores, UE y terceros | Manual | Obligatoria |
| Nóminas, facturas profesionales y alquiler | 111/190 y 115/180 | Manual | Obligatoria |
| Certificados de residencia y convenios | 216/296 | Manual y revisión profesional | Obligatoria |
| Modelos anteriores | Coherencia histórica y periodicidad | Manual | Obligatoria |

Los PDFs escaneados sin texto, protegidos, dañados, de más de 4 MB o de más de 80 páginas no se procesan. OCR local y OCR externo permanecen deshabilitados. No se interpreta una captura, una conversación ni un texto libre como censo.

## Reconciliación censal

La persona debe distinguir entre:

- no haber revisado el censo;
- haberlo revisado y confirmar una lista vacía; y
- haberlo revisado y seleccionar los códigos que aparecen expresamente.

Solo los códigos periódicos acotados 111, 115, 123, 130, 131, 216 y 303 entran en el cruce censal inicial. Una discrepancia nunca cambia automáticamente el censo ni elimina una obligación: genera `CENSUS_MISMATCH` y una acción de revisión.

