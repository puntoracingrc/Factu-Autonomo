# Fuentes legales oficiales

Fecha de recuperación del registro: **2026-07-12**.

Las reglas solo citan BOE, AEAT o Dirección General de Tributos. Ningún blog,
foro o proveedor comercial fundamenta una conclusión. El texto consolidado
vigente debe volver a verificarse cuando se cree una nueva versión de regla.
Un modelo de IA tampoco es una fuente jurídica. Cada fuente que una regla pueda
usar durante una evaluación debe ser oficial y tener estado `VERIFIED` en el
registro; el estado legal `PENDING_REVIEW` de la regla no rebaja esta exigencia.
Una definición `DRAFT` puede conservar una referencia pendiente únicamente
mientras esté excluida de la ejecución.

## Fuentes verificadas que fundamentan el motor

| Materia | Fuente oficial | Referencia | Uso |
|---|---|---|---|
| Manutención propia | [Ley 35/2006, IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a30) | Art. 30.2.5.ª.c) | Actividad, restauración/hostelería, pago electrónico y remisión a límites. |
| Límites diarios | [RD 439/2007, RIRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a9) | Art. 9.A.3.a) | 26,67/48,08 € sin pernocta y 53,34/91,35 € con pernocta. |
| Estimación directa | [Ley 35/2006, IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a28) | Art. 28.1 | Remisión general a normas del Impuesto sobre Sociedades. |
| Atención a clientes/proveedores | [Ley 27/2014, IS](https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328#a15) | Art. 15.e) | Límite anual conjunto del 1 % del INCN. |
| Afectación de vehículos en IRPF | [RD 439/2007, RIRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a22) | Art. 22 | Exclusividad del turismo y excepciones tasadas. |
| Vehículos y gastos asociados en IVA | [Ley 37/1992, IVA](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a95) | Art. 95.Tres y Cuatro | Presunciones 50/100 %, prueba y extensión a combustible, parking, peajes y reparación. |
| Exclusiones de IVA | [Ley 37/1992, IVA](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a96) | Art. 96.Uno.5.º y 6.º | Atenciones a terceros y hostelería/restauración. |
| Documento para deducir IVA | [Ley 37/1992, IVA](https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a97) | Art. 97 | Posesión de factura/documento válido y cuota separada. |
| Factura simplificada | [RD 1619/2012](https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696#a7) | Art. 7.2 | NIF y domicilio del destinatario y cuota separada para deducir IVA. |
| Correlación y prueba de manutención | [DGT V1184-22](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V1184-22) | 26-05-2022 | Correlación, imputación, registro y justificación. |

## Referencias DGT pendientes de reverificación de metadatos

Las siguientes consultas se localizaron en el buscador oficial y ayudan a
identificar riesgos, pero el sitio oficial no permitió recuperar de forma
estable todos sus metadatos durante esta implementación. En el registro se
marcan `PENDING_VERIFICATION`; no pueden asociarse a una regla ejecutable hasta
que el asesor conserve una copia verificable y confirme fecha y alcance.
Su campo `effectiveFrom` permanece explícitamente a `null`: no se ha inferido
el 1 de enero a partir del año incluido en el número de consulta.
Estas referencias se conservan únicamente para revisión jurídica y no se
adjuntan a ninguna regla ejecutable mientras sigan pendientes.

- [V1611-24](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V1611-24): afectación y prueba de gastos concretos de vehículo.
- [V2119-25](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2119-25): rotulación y otros indicios no prueban por sí solos exclusividad.
- [V2119-20](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2119-20) y [V2683-21](https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2683-21): tensión doctrinal al separar restauración correlacionada y atención gratuita a clientes.

## Contrato de fuentes del fallback de IA

El fallback recibe exclusivamente entradas del registro con
`verificationStatus: VERIFIED` y autoridad BOE, AEAT o DGT. Cada elemento se
suministra con `sourceId` y un ID de fragmento estable con sufijo
`:verified-summary:v1`. Las fuentes pendientes de la sección anterior se
filtran antes de construir el contexto.

La salida solo puede devolver IDs que estén en ese conjunto. El servidor ignora
cualquier título, URL o referencia creada por el modelo y reconstruye las
fuentes visibles desde el registro canónico. El validador rechaza fuentes no
suministradas, pendientes, ajenas a la categoría propuesta y referencias libres
a artículos o consultas dentro de la narrativa.

Los fragmentos actuales son resúmenes verificados de aplicación, no citas
literales completas ni un corpus suficiente para automatizar una liquidación.
Por ello el contexto se marca `VERIFIED_SUMMARIES_REVIEW_ONLY`: una respuesta
que declare fuentes suficientes para fijar porcentajes o importes se rechaza.
Una respuesta válida debe dejar ambos valores en `null`, explicar qué fuente o
hecho falta y permanecer en `NEEDS_REVIEW`. Incorporar extractos legales aptos
para cálculo exigirá revisión fiscal, procedencia verificable, versionado del
fragmento y nuevas pruebas antes de cambiar esta puerta.

## Criterios que requieren revisión fiscal

Antes de activar las reglas operativamente, un asesor debe aprobar por escrito:

1. La base exacta del límite diario cuando existe IVA no deducible y varios
   tickets el mismo día.
2. El tratamiento de una comida de trabajo con cliente frente a una atención
   gratuita, especialmente en IVA. La versión solicitada aplica IVA cero a la
   categoría confirmada de atención, pero conserva la advertencia y revisión.
3. El uso del INCN en ejercicios abiertos, varias actividades, cambios de
   titularidad o períodos no anuales.
4. La suficiencia de pruebas de exclusividad de turismos y de porcentajes de IVA
   distintos de las presunciones.
5. El tratamiento IRPF del IVA no deducible y de documentos que no sean factura.
6. Prorrata, sectores diferenciados, actividades exentas y cualquier derecho a
   deducir IVA que no sea pleno y conocido.
7. La simplificación de reutilizar la evaluación del vehículo, asegurando que
   cada gasto concreto siga vinculado y acreditado.
8. La futura integración con un perfil fiscal canónico de vehículo; en esta
   fase solo se exige un identificador estable y no se comparan evaluaciones
   previas entre facturas.

No se ha incluido ninguna regla de Canarias/IGIC, IPSI, Navarra, País Vasco,
Impuesto sobre Sociedades o vehículos adquiridos/amortizados.
