# JOB_COST_LEARNING_AND_PRICE_INTELLIGENCE_V1

> Documento de investigacion futura. No implica implementacion inmediata ni compromiso comercial. Cualquier desarrollo derivado debera validarse con datos reales anonimizados, revision tecnica, revision legal/fiscal cuando aplique y respeto a la integridad documental de Factura Autonomo.

## Memoria inteligente de trabajos y base viva de precios de compra

**Estado:** `FUTURE / RESEARCH / NOT IMPLEMENTED`
**Producto:** Facturación Autónomos
**Ámbito:** presupuestos, trabajos por encargo, costes orientativos y aprendizaje operativo
**Prioridad recomendada:** posterior al núcleo estable de clientes, presupuestos, facturas, gastos, documentos e integridad fiscal

---

## 1. Resumen ejecutivo y decisión principal

Esta propuesta define una función futura para que Facturación Autónomos recuerde cuánto costaron realmente trabajos anteriores y utilice esa experiencia para advertir al profesional cuando prepare presupuestos similares.

La función no debe obligar al usuario a llevar una contabilidad analítica perfecta ni a repartir cada factura de proveedor entre diferentes trabajos. Ese enfoque generaría demasiada carga manual y sería poco realista para autónomos que compran, en una misma factura, materiales destinados a varios encargos, reposición de stock, consumibles generales y artículos cuyo destino todavía no se conoce.

La decisión de producto recomendada es separar claramente dos sistemas:

1. **Base viva de precios de compra:** se alimenta de las líneas detectadas en facturas de proveedores y conserva observaciones históricas de precios por artículo, proveedor, fecha, formato y unidad. Su finalidad es ofrecer costes de referencia actualizados.
2. **Memoria de trabajos realizados:** compara lo presupuestado con las horas, incidencias y costes adicionales declarados al cerrar cada trabajo. Su finalidad es aprender de desviaciones y avisar en presupuestos futuros.

### Decisión clave

> En V1, la asignación detallada de compras a trabajos será opcional. El sistema se basará principalmente en precios de referencia, cantidades previstas o confirmadas, horas reales e incidencias de cierre.

Una factura de proveedor podrá mejorar la base de precios aunque ninguna de sus líneas se asigne a un trabajo concreto.

El sistema no pretende convertirse inicialmente en un ERP de almacén, un sistema de inventario perpetuo ni una contabilidad de costes completa.

---

## 2. Problema que se quiere resolver

Los autónomos que trabajan por encargo suelen calcular presupuestos utilizando una combinación de experiencia, memoria, precios recientes, llamadas a proveedores y estimaciones de tiempo.

El problema no suele ser únicamente desconocer el precio de un material. La desviación aparece porque dos trabajos aparentemente iguales pueden requerir esfuerzos muy distintos.

Ejemplos:

- La misma persiana puede instalarse en obra nueva o en una vivienda habitada con cortinas, muebles, acceso complicado y adaptaciones no previstas.
- Pintar el mismo número de metros cuadrados puede requerir tiempos radicalmente distintos en un piso vacío o en otro lleno de muebles, con paredes deterioradas y ocupantes presentes.
- Una reparación puede exigir una segunda visita, otro operario, más desplazamientos o materiales auxiliares que no figuraban en el presupuesto.
- Un artículo comprado hace seis meses puede haber subido considerablemente, aunque el profesional siga recordando el precio antiguo.

Los catálogos tradicionales con precios fijos no resuelven este problema porque:

- los precios de proveedor cambian;
- los descuentos varían;
- los formatos y embalajes cambian;
- el coste de instalación depende del contexto;
- mantener manualmente el catálogo actualizado es pesado;
- un precio bloqueado puede provocar presupuestos incorrectos;
- la mayoría de las compras no se corresponde limpiamente con un único trabajo.

---

## 3. Hipótesis de producto

La hipótesis es que Facturación Autónomos puede aportar más valor actuando como una **memoria operativa del negocio** que como un simple catálogo de productos.

El sistema debe ayudar a responder cuatro preguntas:

1. **¿Cuánto me está costando últimamente este material?**
2. **¿Cuánto tiempo me llevaron realmente trabajos parecidos?**
3. **¿Qué dificultades olvidé presupuestar en ocasiones anteriores?**
4. **¿Estoy usando un coste antiguo o presupuestando con un margen demasiado estrecho?**

La función debe ayudar, no imponer.

> El profesional conserva siempre la última palabra sobre cantidades, costes, margen y precio final.

---

## 4. Objetivos

### 4.1 Objetivos funcionales

- Crear una base histórica de precios de compra a partir de facturas de proveedores.
- Evitar que el usuario tenga que mantener manualmente un catálogo rígido.
- Conservar el precio utilizado cuando se creó cada presupuesto.
- Comparar estimaciones con resultados reales o aproximados al cerrar trabajos.
- Registrar horas adicionales, materiales imprevistos e incidencias.
- Convertir incidencias confirmadas en aprendizajes reutilizables.
- Encontrar trabajos similares mediante reglas explicables.
- Mostrar avisos antes de que el usuario repita un error de cálculo.
- Mantener todos los importes sugeridos como editables.
- Indicar claramente si un margen es estimado, parcialmente confirmado o real.

### 4.2 Objetivos de experiencia de usuario

- Evitar repartos obligatorios de facturas de proveedor.
- Permitir cerrar un trabajo en menos de un minuto en modo rápido.
- Permitir dictar una explicación y estructurarla con ayuda de IA.
- No exigir registrar cada tornillo, consumible o movimiento de almacén.
- Mostrar recomendaciones comprensibles y justificadas.
- Permitir ignorar, corregir o eliminar aprendizajes.

### 4.3 Objetivos estratégicos

- Diferenciar Facturación Autónomos de los programas genéricos de facturación.
- Atender especialmente a profesionales de instalaciones, reparaciones, mantenimiento, reformas y trabajos a medida.
- Ayudar al autónomo a proteger margen sin imponer tarifas.
- Convertir la información que ya existe en facturas y presupuestos en conocimiento útil.

---

## 5. No objetivos de V1

La primera versión no debe intentar:

- llevar inventario perpetuo;
- calcular existencias exactas;
- aplicar FIFO, LIFO o coste medio contable de almacén;
- obligar a vincular todas las compras a trabajos;
- repartir automáticamente una factura mixta entre varios trabajos;
- sustituir la contabilidad oficial;
- decidir qué gastos son fiscalmente deducibles;
- modificar automáticamente precios de venta;
- cambiar presupuestos aceptados;
- cambiar facturas emitidas;
- aprender de forma opaca sin confirmación del usuario;
- comparar o mezclar datos de diferentes empresas;
- garantizar un margen real cuando faltan costes.

---

## 6. Principios de diseño

### 6.1 Separar contabilidad, compras y costes de trabajo

Una factura de proveedor es un documento contable o fiscal. Una estimación de coste de trabajo es información de gestión interna.

No deben confundirse.

- La factura de proveedor se registra una sola vez en el módulo de gastos.
- Sus líneas pueden alimentar observaciones de precios.
- Vincular una línea a un trabajo será opcional.
- Un coste adicional declarado al cerrar un trabajo no se convierte automáticamente en un gasto contable.
- El sistema debe evitar duplicar gastos o presentar estimaciones internas como documentos fiscales.

### 6.2 Observaciones históricas, no precios sobrescritos

Cada compra confirmada debe crear una observación de precio con fecha y origen.

No se sustituirá el precio antiguo por el nuevo. Se conservará la serie histórica.

### 6.3 Fotografías inmutables del presupuesto

Cuando se crea o acepta un presupuesto, debe guardarse una fotografía de:

- cantidades previstas;
- costes de referencia utilizados;
- origen y fecha de esos costes;
- horas estimadas;
- coste interno por hora;
- factores de dificultad;
- margen previsto.

Los cambios futuros en la base de precios no deben alterar presupuestos históricos.

### 6.4 Recomendaciones explicables

Toda recomendación debe indicar:

- qué trabajos anteriores se han considerado;
- qué similitudes se han detectado;
- cuántos casos sustentan el aviso;
- qué desviación ocurrió;
- qué ajuste se sugiere;
- si la evidencia es débil, media o fuerte.

### 6.5 Nunca modificar importes sin consentimiento

El sistema podrá proponer:

- añadir horas;
- aumentar contingencia;
- actualizar un coste;
- añadir un factor de dificultad;
- revisar el margen.

Nunca aplicará esos cambios silenciosamente.

---

## 7. Conceptos principales

### 7.1 Artículo de referencia

Representación normalizada de un material o suministro habitual.

Ejemplos:

- lama de aluminio térmica 45 mm;
- pintura plástica blanca 15 L;
- motor tubular 20 Nm;
- cinta de carrocero 48 mm;
- guía de aluminio modelo X.

No tiene por qué ser un producto de venta ni tener un precio fijo.

### 7.2 Alias de proveedor

Nombre, referencia o descripción con la que un proveedor identifica un artículo.

Un mismo artículo puede aparecer como:

- `MOTOR TUB. 20N 45MM`;
- `Motor tubular 20 Nm final carrera mecánico`;
- referencia `MT20-45`.

Los alias se relacionan con el artículo normalizado.

### 7.3 Observación de precio de compra

Registro histórico procedente de una línea de factura o introducción manual.

Debe conservar:

- proveedor;
- fecha;
- artículo o alias;
- cantidad;
- unidad;
- formato o embalaje;
- precio bruto;
- descuento;
- coste neto;
- coste unitario normalizado;
- moneda;
- documento de origen;
- confianza del OCR;
- estado de confirmación.

### 7.4 Coste de referencia

Coste sugerido para preparar un presupuesto. Puede derivarse de:

- última compra confirmada;
- mediana de las últimas compras;
- precio preferido de un proveedor;
- coste introducido manualmente;
- precio de una tarifa importada;
- rango reciente.

No es un coste real imputado al trabajo.

### 7.5 Fotografía de costes del presupuesto

Conjunto de costes y supuestos utilizados en una versión concreta del presupuesto.

Debe quedar congelado para preservar la trazabilidad.

### 7.6 Cierre del trabajo

Proceso mediante el cual el usuario informa de cómo terminó el trabajo:

- horas reales;
- número de visitas;
- materiales adicionales;
- costes extraordinarios;
- incidencias;
- cambios de alcance;
- margen orientativo;
- lecciones reutilizables.

### 7.7 Aprendizaje de trabajo

Regla o recordatorio confirmado por el usuario a partir de una desviación real.

Ejemplo:

> En viviendas amuebladas, este tipo de instalación suele requerir entre 1,5 y 2,5 horas adicionales para retirar cortinas, mover objetos y proteger la zona.

### 7.8 Recomendación futura

Aviso mostrado al preparar un trabajo similar.

No modifica nada hasta que el usuario lo acepta.

---

## 8. Arquitectura funcional propuesta

La solución se divide en cuatro componentes desacoplados:

### 8.1 Price Intelligence

Responsable de:

- leer líneas de facturas de proveedor;
- normalizar artículos y unidades;
- conservar históricos de precio;
- detectar subidas o bajadas;
- ofrecer costes de referencia.

### 8.2 Quote Cost Snapshot

Responsable de:

- congelar los costes utilizados en cada presupuesto;
- registrar el origen de cada coste;
- conservar horas y supuestos;
- impedir que las actualizaciones posteriores cambien el histórico.

### 8.3 Job Closeout

Responsable de:

- recoger horas reales;
- registrar incidencias;
- añadir desviaciones económicas;
- diferenciar sobrecostes internos y extras facturables;
- calcular el nivel de confianza del resultado.

### 8.4 Job Learning and Recommendations

Responsable de:

- identificar trabajos similares;
- calcular patrones;
- generar avisos;
- solicitar confirmación;
- registrar si el usuario aceptó o descartó la recomendación.

---

## 9. Flujo de facturas de proveedor y base de precios

### 9.1 Entrada

El usuario escanea o importa una factura de proveedor mediante el módulo de control de gastos.

### 9.2 Extracción

El sistema intenta detectar:

- proveedor;
- fecha;
- número de factura;
- líneas;
- referencias;
- descripciones;
- cantidades;
- unidades;
- precios;
- descuentos;
- impuestos;
- importes totales.

### 9.3 Normalización

Para cada línea apta:

1. Se busca coincidencia por referencia exacta del proveedor.
2. Se buscan alias confirmados anteriormente.
3. Se compara la descripción normalizada.
4. Se analiza formato y unidad.
5. Se propone un artículo de referencia existente o uno nuevo.
6. El usuario confirma en caso de duda.

### 9.4 Creación de observaciones

Una línea confirmada puede crear una observación de precio aunque su destino sea:

- un trabajo concreto;
- varios trabajos;
- reposición de stock;
- consumo general;
- todavía desconocido.

### 9.5 Regla esencial

> La utilidad de una factura para actualizar precios no depende de que se impute a un trabajo.

---

## 10. Tratamiento de facturas mixtas

Las facturas mixtas son el caso normal, no una excepción.

Una factura puede contener:

- materiales para el trabajo A;
- materiales para el trabajo B;
- artículos para stock;
- consumibles generales;
- herramientas;
- portes;
- productos cuyo destino se decidirá después.

### 10.1 Estados de asignación sugeridos

A nivel de factura o línea:

- `unassigned`: sin asignar;
- `direct_job`: compra directa para un trabajo;
- `stock_or_general`: stock o consumo general;
- `mixed_unknown`: destino mixto o no determinado;
- `excluded_from_price_intelligence`: línea no apta para precios;
- `partially_allocated`: asignación parcial opcional.

### 10.2 Comportamiento por defecto

- Todas las líneas empiezan como `unassigned` o `mixed_unknown`.
- El usuario no debe ser obligado a clasificarlas.
- Las líneas pueden alimentar precios independientemente de su asignación.
- Solo una vinculación explícita afectará al coste directo de un trabajo.

### 10.3 No repartir automáticamente

En V1 no debe intentarse repartir automáticamente una factura entre trabajos basándose en fechas, clientes o similitudes. Podrían mostrarse sugerencias opcionales, pero nunca contabilizarlas sin confirmación.

### 10.4 Compras para stock

Una compra marcada como stock:

- actualiza el precio de referencia;
- no aumenta automáticamente el coste de ningún trabajo;
- no obliga a llevar unidades disponibles;
- podrá utilizarse posteriormente como referencia al declarar materiales consumidos.

---

## 11. Cómo calcular costes de trabajo sin imputar todas las compras

La función debe admitir varios niveles de precisión.

### 11.1 Coste previsto de materiales

Al preparar el presupuesto:

`coste_material_previsto = cantidad_prevista × coste_referencia_congelado`

El coste de referencia puede provenir de la base de precios.

### 11.2 Coste de materiales al cierre

Opciones ordenadas de menor a mayor esfuerzo:

#### Opción A — Mantener cantidades previstas

El usuario confirma que no hubo cambios relevantes.

Se mantiene el coste previsto como aproximación.

#### Opción B — Registrar solo desviaciones

El usuario indica:

- dos motores adicionales;
- 15 litros más de pintura;
- 40 € de consumibles imprevistos;
- una pieza sustituida no prevista.

No necesita volver a introducir todo lo utilizado.

#### Opción C — Confirmar cantidades realmente usadas

El usuario ajusta cantidades de materiales principales.

El sistema usa el coste histórico congelado o el último coste válido anterior al trabajo, según la política elegida.

#### Opción D — Vincular compras directas

Cuando una compra fue claramente realizada para un trabajo, el usuario puede vincular la factura o determinadas líneas.

Esto será opcional.

### 11.3 Coste de mano de obra

`coste_mano_obra = horas_reales × coste_interno_hora`

El coste interno por hora no es necesariamente el precio de venta por hora. Puede incluir:

- remuneración objetivo;
- Seguridad Social o costes empresariales configurados;
- estructura;
- herramientas;
- tiempo no facturable;
- margen de seguridad.

La definición exacta quedará para una investigación posterior de costes internos.

### 11.4 Ajustes operativos

Se podrán añadir ajustes como:

- desplazamiento adicional;
- segundo operario;
- alquiler de herramienta;
- aparcamiento;
- retirada de residuos;
- reparación previa;
- protección especial;
- consumibles;
- subcontratación;
- incidencia no prevista.

Estos ajustes son información de gestión y no generan por sí mismos un gasto contable.

---

## 12. Niveles de confianza del coste y margen

El sistema no debe presentar falsa precisión.

### 12.1 `REFERENCE_ONLY`

Datos disponibles:

- costes de referencia;
- horas previstas;
- sin cierre real suficiente.

Mostrar:

> Margen previsto

### 12.2 `PARTIAL_ACTUAL`

Datos disponibles:

- horas reales;
- algunas desviaciones confirmadas;
- materiales basados total o parcialmente en precios de referencia.

Mostrar:

> Margen estimado con datos parciales

### 12.3 `MOSTLY_ACTUAL`

Datos disponibles:

- horas reales;
- cantidades principales confirmadas;
- costes directos relevantes;
- algunos consumibles o gastos generales estimados.

Mostrar:

> Margen operativo estimado

### 12.4 `ACTUAL_COMPLETE`

Solo si el usuario ha confirmado de forma suficiente:

- horas;
- materiales;
- compras directas;
- subcontratación;
- ajustes;
- ingresos finales.

Mostrar:

> Margen real registrado

El sistema debe ser conservador al asignar esta categoría.

---

## 13. Selección del coste de referencia

El usuario podrá elegir una política global o por artículo.

### 13.1 Última compra confirmada

Ventaja:

- refleja el precio más reciente.

Riesgo:

- una compra excepcional puede distorsionar.

### 13.2 Mediana de las últimas N compras

Ventaja:

- reduce impacto de valores atípicos.

Riesgo:

- puede reaccionar lentamente a subidas bruscas.

### 13.3 Proveedor preferido

Usa las observaciones del proveedor marcado como habitual.

### 13.4 Rango reciente

Muestra:

- último precio;
- mediana reciente;
- mínimo;
- máximo;
- variación porcentual.

Recomendación de UX:

No elegir automáticamente un único coste cuando exista alta volatilidad. Mostrar un rango y pedir confirmación.

### 13.5 Coste manual

El usuario puede introducir un coste propio y decidir si:

- solo aplica al presupuesto actual;
- se guarda como referencia manual;
- sustituye temporalmente la sugerencia;
- no afecta al histórico de compras.

---

## 14. Normalización de unidades y formatos

La base de precios solo será útil si compara unidades equivalentes.

Debe distinguir:

- unidad;
- metro;
- metro cuadrado;
- metro lineal;
- kilogramo;
- litro;
- caja;
- paquete;
- rollo;
- juego;
- hora;
- formato personalizado.

Ejemplo:

- Caja de 10 unidades por 120 € → 12 €/unidad.
- Bote de 15 litros por 75 € → 5 €/litro.
- Rollo de 50 metros por 40 € → 0,80 €/metro.

Las conversiones automáticas deben requerir que el formato esté claro. Si no lo está, se conservará el precio por formato original y se solicitará confirmación.

---

## 15. Descuentos, portes e impuestos

### 15.1 Descuentos

El coste de observación debe almacenar:

- precio bruto;
- descuento de línea;
- descuentos globales asignados, si se puede determinar;
- precio neto.

### 15.2 Portes

En V1, los portes no deben repartirse automáticamente entre artículos salvo que el usuario lo solicite.

Opciones:

- tratarlos como coste general de compra;
- vincularlos directamente a un trabajo;
- repartirlos manualmente;
- excluirlos del coste unitario de materiales.

### 15.3 Impuestos

La base interna de coste debe ser configurable. Como regla de gestión, suele ser útil trabajar con coste neto sin impuesto recuperable, pero el sistema no debe asumir que el tratamiento fiscal es idéntico para todos los usuarios.

Debe indicarse claramente que esta información sirve para gestión interna y no sustituye al asesoramiento contable o fiscal.

---

## 16. Flujo de creación de presupuesto

### 16.1 Selección de tipo de trabajo

El usuario elige o crea un tipo de trabajo:

- instalación de persiana;
- pintura interior;
- reparación eléctrica;
- montaje de carpintería;
- mantenimiento;
- sesión fotográfica;
- servicio por proyecto.

### 16.2 Contexto

El sistema puede preguntar por factores relevantes:

- obra nueva, local o vivienda habitada;
- inmueble vacío o amueblado;
- acceso normal o complicado;
- desmontaje previo;
- altura;
- protección especial;
- número de operarios;
- distancia;
- aparcamiento;
- retirada de residuos;
- urgencia;
- número de visitas previsto.

### 16.3 Costes de referencia

Para cada material principal se muestra:

- coste sugerido;
- fecha del último precio;
- proveedor;
- variación reciente;
- nivel de confianza;
- posibilidad de editar.

### 16.4 Avisos de trabajos similares

Ejemplo:

> En 4 trabajos similares realizados en viviendas amuebladas necesitaste una mediana de 2,1 horas adicionales. En 3 de ellos también hubo una segunda visita.

Acciones:

- `Añadir 2 horas`;
- `Añadir contingencia`;
- `Ver trabajos`;
- `Ignorar`;
- `No aplicar a este presupuesto`.

### 16.5 Congelación

Al guardar una versión del presupuesto se crea la fotografía de costes y supuestos.

---

## 17. Seguimiento durante el trabajo

El registro durante la ejecución debe ser opcional y rápido.

### 17.1 Acciones rápidas

- iniciar o detener temporizador;
- añadir horas manuales;
- registrar visita;
- añadir material extra;
- registrar incidencia;
- adjuntar fotografía;
- dictar nota;
- marcar cambio solicitado por el cliente;
- crear propuesta de ampliación.

### 17.2 No obligar a registrar todo en tiempo real

El usuario podrá reconstruir el cierre al finalizar.

La aplicación no debe convertir el trabajo de campo en una tarea administrativa constante.

---

## 18. Cierre rápido del trabajo

El modo rápido debe poder completarse con pocas preguntas.

### 18.1 Preguntas mínimas

1. ¿Cuántas horas reales se emplearon?
2. ¿Hubo más o menos materiales de los previstos?
3. ¿Apareció algún coste adicional relevante?
4. ¿Qué dificultó o facilitó el trabajo?
5. ¿Quieres guardar alguna lección para el futuro?

### 18.2 Ejemplo de entrada por voz

> Tardamos dos horas más. Había cinco cortinas, muebles delante de las ventanas y hubo que adaptar dos guías. Gastamos unos cuarenta euros más de material y tuvimos que volver otro día.

La IA podría proponer:

- `+2 horas`;
- `+40 € materiales imprevistos`;
- factor `RETIRAR_CORTINAS`;
- factor `VIVIENDA_AMUEBLADA`;
- factor `ADAPTACION_GUIAS`;
- `+1 visita`.

El usuario debe confirmar antes de guardar.

---

## 19. Cierre detallado del trabajo

El modo detallado permitirá revisar:

- horas por trabajador;
- tiempos de desplazamiento;
- número de visitas;
- materiales principales usados;
- materiales adicionales;
- compras directas vinculadas;
- subcontrataciones;
- gastos operativos;
- extras facturados;
- importe final cobrado;
- causa de cada desviación;
- margen estimado o real;
- aprendizaje resultante.

---

## 20. Sobrecoste interno frente a extra facturable

Esta distinción es obligatoria.

### 20.1 Sobrecoste interno

Ejemplos:

- se estimaron pocas horas;
- se olvidó una dificultad visible;
- hubo que volver por un error propio;
- el montaje era más complejo de lo previsto;
- se utilizaron más consumibles.

Consecuencia:

- afecta a la rentabilidad;
- genera aprendizaje;
- no aumenta automáticamente la factura del cliente.

### 20.2 Trabajo adicional facturable

Ejemplos:

- el cliente solicita más trabajo;
- aparece una reparación fuera del alcance inicial;
- se cambia un material;
- se añade otro elemento;
- se requiere una actuación adicional aceptada.

Consecuencia:

- puede generar ampliación de presupuesto;
- debe requerir aceptación cuando corresponda;
- no debe añadirse silenciosamente a la factura.

---

## 21. Factores de contexto reutilizables

Catálogo inicial orientativo:

- `VIVIENDA_AMUEBLADA`
- `RETIRAR_CORTINAS`
- `PROTECCION_ESPECIAL`
- `ACCESO_DIFICIL`
- `APARCAMIENTO_DIFICIL`
- `SIN_ASCENSOR`
- `TRABAJO_EN_ALTURA`
- `DESMONTAJE_COMPLEJO`
- `ADAPTACION_HUECO`
- `ADAPTACION_GUIAS`
- `SEGUNDO_OPERARIO`
- `SEGUNDA_VISITA`
- `CLIENTE_PRESENTE`
- `HORARIO_RESTRINGIDO`
- `RETIRADA_RESIDUOS`
- `MATERIALES_NO_PREVISTOS`
- `SUPERFICIE_EN_MAL_ESTADO`
- `CAMBIO_COLOR_COMPLEJO`
- `MOVER_MUEBLES`
- `PROTECCION_SUELOS`
- `URGENCIA`

Los factores no deben contener automáticamente un suplemento fijo. Son contexto y memoria.

Cada empresa podrá crear sus propios factores.

---

## 22. Similaridad entre trabajos

### 22.1 V1 basada en reglas

La primera versión debe utilizar reglas transparentes, no un modelo de IA opaco.

Características posibles:

- tipo de trabajo;
- plantilla utilizada;
- materiales principales;
- rango de medidas o cantidades;
- factores de contexto;
- número de elementos;
- tipo de inmueble;
- número de operarios;
- distancia;
- cliente particular o empresa;
- localidad o zona;
- etiquetas manuales.

### 22.2 Ponderación conceptual

Ejemplo orientativo:

- mismo tipo de trabajo: peso alto;
- mismos factores de contexto: peso alto;
- cantidades similares: peso medio;
- mismos materiales: peso medio;
- misma zona o acceso: peso medio;
- mismo cliente: peso bajo o separado.

No fijar pesos definitivos sin pruebas con datos reales.

### 22.3 Evidencia mínima

- 1 caso: anécdota, mostrar con advertencia.
- 2–4 casos: patrón emergente.
- 5 o más casos coherentes: patrón con mayor confianza.

Se recomienda utilizar medianas y rangos, no solo medias, para reducir el efecto de valores extremos.

---

## 23. Tipos de aviso

### 23.1 Precio desactualizado

> El coste usado para este motor tiene 142 días. La última compra confirmada es un 17,8 % más cara.

### 23.2 Tiempo infravalorado

> Has presupuestado 4 horas. En 6 trabajos similares la mediana fue de 6,2 horas.

### 23.3 Factor olvidado

> En 3 trabajos similares con vivienda amueblada registraste protección y movimiento de muebles, pero no aparece en este presupuesto.

### 23.4 Segunda visita frecuente

> Este tipo de trabajo requirió una segunda visita en 4 de los últimos 7 casos.

### 23.5 Margen estrecho

> Con los últimos costes de compra y las horas estimadas, el margen previsto está por debajo del umbral configurado.

### 23.6 Alta volatilidad

> El precio de este artículo ha variado un 24 % en los últimos 90 días. Revisa el coste antes de enviar el presupuesto.

---

## 24. Acciones sobre avisos

Todo aviso debe permitir:

- aplicar sugerencia;
- editar antes de aplicar;
- ver evidencia;
- ignorar una vez;
- descartar permanentemente para ese tipo de trabajo;
- marcar como no relevante;
- corregir el aprendizaje que lo originó.

La respuesta del usuario se guardará para mejorar futuras sugerencias.

---

## 25. Aprendizajes reutilizables

Un aprendizaje debe contener:

- título;
- explicación;
- tipo de trabajo;
- factores asociados;
- impacto temporal;
- impacto económico;
- número de casos;
- trabajos de origen;
- fecha de actualización;
- confianza;
- alcance;
- estado.

### 25.1 Alcance

- solo este cliente;
- solo este tipo de trabajo;
- este oficio;
- general para la empresa.

### 25.2 Estados

- `draft`;
- `confirmed`;
- `active`;
- `muted`;
- `superseded`;
- `deleted`.

---

## 26. Modelo conceptual de datos

No crear migraciones en esta fase.

### 26.1 `material_references`

- id
- organizationId
- canonicalName
- category
- baseUnit
- status
- createdAt
- updatedAt

### 26.2 `supplier_item_aliases`

- id
- organizationId
- supplierId
- materialReferenceId
- supplierSku
- rawDescription
- normalizedDescription
- packageQuantity
- packageUnit
- confirmationStatus
- createdAt

### 26.3 `purchase_price_observations`

- id
- organizationId
- supplierDocumentId
- supplierDocumentLineId
- supplierId
- materialReferenceId
- observedAt
- rawQuantity
- rawUnit
- normalizedQuantity
- normalizedUnit
- grossAmount
- discountAmount
- netAmount
- normalizedUnitCost
- currency
- ocrConfidence
- confirmationStatus
- allocationStatus
- createdAt

### 26.4 `job_types`

- id
- organizationId
- name
- tradeCategory
- status
- createdAt

### 26.5 `jobs`

- id
- organizationId
- customerId
- quoteId
- jobTypeId
- status
- scheduledAt
- startedAt
- completedAt
- closedAt
- location
- metadata

### 26.6 `job_context_factors`

- id
- organizationId
- code
- label
- description
- category
- status

### 26.7 `job_context_factor_assignments`

- id
- jobId
- factorId
- source
- confidence
- confirmedByUser
- createdAt

### 26.8 `quote_cost_snapshots`

- id
- organizationId
- quoteId
- quoteVersionId
- totalReferenceMaterialCost
- estimatedLaborHours
- internalLaborCost
- estimatedOtherCosts
- estimatedMargin
- costConfidence
- createdAt

### 26.9 `quote_cost_snapshot_lines`

- id
- snapshotId
- quoteLineId
- materialReferenceId
- estimatedQuantity
- normalizedUnit
- referenceUnitCost
- priceObservationId
- priceSourceType
- priceObservedAt
- estimatedCost
- manuallyOverridden

### 26.10 `job_time_entries`

- id
- jobId
- workerId
- startedAt
- endedAt
- durationMinutes
- entrySource
- notes
- createdAt

### 26.11 `job_material_usage`

Entidad opcional; no representa inventario.

- id
- jobId
- materialReferenceId
- quantity
- unit
- costBasisType
- unitCost
- priceObservationId
- source
- confidence
- createdAt

### 26.12 `job_cost_adjustments`

- id
- jobId
- category
- description
- amount
- currency
- adjustmentType
- billableStatus
- accountingDocumentId
- evidenceType
- confidence
- createdAt

### 26.13 `job_closeouts`

- id
- jobId
- closeoutMode
- actualLaborMinutes
- estimatedMaterialCost
- confirmedMaterialCost
- otherOperationalCosts
- finalRevenue
- marginAmount
- marginPercentage
- costConfidence
- notes
- confirmedAt
- confirmedBy

### 26.14 `job_variances`

- id
- jobId
- varianceType
- estimatedValue
- actualOrDeclaredValue
- differenceValue
- differencePercentage
- causeCode
- notes
- createdAt

### 26.15 `job_lessons`

- id
- organizationId
- jobTypeId
- title
- description
- scope
- estimatedTimeImpactMinutes
- estimatedCostImpact
- currency
- confidenceLevel
- sampleCount
- status
- createdAt
- updatedAt

### 26.16 `job_lesson_sources`

- id
- lessonId
- jobId
- varianceId
- weight
- createdAt

### 26.17 `job_recommendations`

- id
- organizationId
- quoteId
- jobTypeId
- recommendationType
- message
- suggestedAction
- suggestedTimeMinutes
- suggestedAmount
- evidenceCount
- confidenceLevel
- status
- createdAt

### 26.18 `job_recommendation_feedback`

- id
- recommendationId
- action
- appliedValue
- reason
- actorId
- createdAt

---

## 27. Estados del trabajo

Propuesta conceptual:

- `draft`;
- `quoted`;
- `quote_sent`;
- `accepted`;
- `scheduled`;
- `in_progress`;
- `blocked`;
- `completed_pending_closeout`;
- `closed`;
- `invoiced`;
- `cancelled`.

El aprendizaje solo debe utilizar trabajos `closed` y confirmados.

---

## 28. Eventos de dominio orientativos

- `supplier_document_imported`
- `supplier_line_extracted`
- `price_observation_created`
- `price_observation_confirmed`
- `material_alias_confirmed`
- `quote_cost_snapshot_created`
- `job_started`
- `job_time_added`
- `job_incident_recorded`
- `job_completed`
- `job_closeout_confirmed`
- `job_variance_calculated`
- `job_lesson_proposed`
- `job_lesson_confirmed`
- `similar_job_warning_generated`
- `recommendation_applied`
- `recommendation_ignored`

Todos los eventos relevantes deben ser auditables.

---

## 29. Papel de la IA

La IA debe actuar como asistente de estructuración y búsqueda, no como autoridad de precios.

### 29.1 Usos permitidos

- extraer líneas de facturas;
- proponer coincidencias entre aliases y materiales;
- convertir notas de voz en horas, costes y factores;
- resumir desviaciones;
- proponer etiquetas;
- encontrar candidatos a trabajos similares;
- redactar un aviso comprensible;
- detectar descripciones ambiguas;
- sugerir preguntas que faltan antes de cerrar.

### 29.2 Acciones que requieren confirmación

- crear un artículo normalizado;
- unir dos referencias;
- convertir unidades;
- asignar una compra a un trabajo;
- registrar un coste adicional;
- crear un aprendizaje;
- aplicar una recomendación;
- modificar un presupuesto;
- generar una ampliación facturable.

### 29.3 Acciones prohibidas

- cambiar precios automáticamente;
- alterar presupuestos aceptados;
- alterar facturas emitidas;
- clasificar definitivamente un gasto fiscal sin revisión;
- inventar cantidades no detectadas;
- mezclar datos entre empresas;
- afirmar que un margen es real con datos incompletos.

---

## 30. Experiencia de usuario recomendada

### 30.1 Panel de precios

Para cada artículo:

- último precio;
- proveedor;
- fecha;
- precio mediano reciente;
- tendencia;
- rango;
- unidad normalizada;
- número de observaciones;
- confianza;
- historial gráfico;
- botón de corrección.

### 30.2 Panel de trabajo

- presupuesto previsto;
- horas previstas;
- horas registradas;
- incidencias;
- costes adicionales;
- nivel de confianza;
- diferencia;
- margen orientativo;
- botón `Cerrar trabajo`.

### 30.3 Cierre rápido

Formato tipo asistente de cinco pasos o una única conversación guiada.

### 30.4 Avisos en presupuesto

Deben ser discretos y no bloquear el flujo.

Ejemplo:

> Recuerdo de trabajos anteriores: en instalaciones similares con cortinas y muebles empleaste entre 1,5 y 3 horas adicionales.

---

## 31. Ejemplo completo: instalación de persiana

### 31.1 Presupuesto

- persiana y accesorios: 215 € según última compra confirmada;
- 2 horas previstas;
- 1 visita;
- desplazamiento: 25 €;
- vivienda marcada inicialmente como acceso normal.

### 31.2 Realidad

- cinco cortinas que retirar;
- muebles delante de las ventanas;
- dos guías que adaptar;
- 4 horas reales;
- segunda visita;
- 38 € de material adicional.

### 31.3 Cierre

El usuario declara:

- `+2 horas`;
- `+1 visita`;
- `+38 € material`;
- factores `RETIRAR_CORTINAS`, `VIVIENDA_AMUEBLADA`, `ADAPTACION_GUIAS`.

### 31.4 Aprendizaje

> Para instalaciones de este tipo en viviendas amuebladas, revisar cortinas, espacio de trabajo y estado de las guías antes de cerrar el presupuesto.

### 31.5 Próximo presupuesto

El sistema detecta una instalación similar y pregunta:

> En trabajos similares, las cortinas, el mobiliario y las adaptaciones añadieron una mediana de 2 horas y 35 € de material. ¿Quieres revisar estos factores?

No modifica el precio por sí solo.

---

## 32. Ejemplo completo: pintura de piso

### 32.1 Presupuesto

- 80 m²;
- vivienda aparentemente estándar;
- pintura estimada según precios recientes;
- 28 horas previstas.

### 32.2 Realidad

- piso lleno de muebles;
- paredes con agujeros;
- color oscuro;
- dos manos adicionales;
- 7 horas moviendo y protegiendo muebles;
- 5 horas reparando paredes;
- más plástico, cinta y masilla.

### 32.3 Cierre

- `+12 horas`;
- materiales adicionales declarados;
- factores `MOVER_MUEBLES`, `PROTECCION_ESPECIAL`, `SUPERFICIE_EN_MAL_ESTADO`, `CAMBIO_COLOR_COMPLEJO`.

### 32.4 Recomendación futura

> Antes de enviar el presupuesto, confirma estado de paredes, mobiliario y cambio de color. En 3 trabajos comparables estos factores añadieron entre 9 y 14 horas.

---

## 33. Informes futuros

### 33.1 Rentabilidad por tipo de trabajo

- margen previsto medio;
- margen estimado final;
- desviación de horas;
- factores que más encarecen;
- frecuencia de segundas visitas.

### 33.2 Artículos con mayor variación

- subidas de precio;
- proveedores;
- artículos desactualizados;
- volatilidad;
- última confirmación.

### 33.3 Errores de presupuesto recurrentes

- horas infravaloradas;
- materiales olvidados;
- desplazamientos no incluidos;
- protección no contemplada;
- trabajos adicionales no formalizados.

### 33.4 Calidad de datos

- trabajos sin cierre;
- costes solo orientativos;
- artículos con unidad dudosa;
- observaciones OCR pendientes;
- recomendaciones ignoradas repetidamente.

---

## 34. Privacidad, aislamiento y seguridad

- Todos los datos de trabajos y compras deben aislarse por organización.
- No se utilizarán datos de una empresa para recomendar precios a otra sin un sistema futuro, agregado, anonimizado y expresamente autorizado.
- Las notas de voz y fotografías deberán seguir las políticas de conservación del producto.
- El usuario podrá eliminar aprendizajes sin borrar documentos fiscales de origen.
- Los cambios manuales en costes, asignaciones y aprendizajes deben quedar auditados.
- Los importes internos no deben aparecer en documentos dirigidos al cliente salvo acción explícita.

---

## 35. Casos límite

### 35.1 Línea de factura ambigua

Ejemplo: `MATERIAL VARIO`.

Comportamiento:

- no crear artículo específico;
- permitir conservarla como coste general;
- pedir desglose solo si el usuario quiere.

### 35.2 Compra con devolución posterior

- conservar observación original;
- registrar devolución o abono relacionado;
- evitar usar el precio neto equivocado;
- no borrar el histórico.

### 35.3 Artículo sustituido por otro equivalente

- permitir relación de equivalencia;
- no fusionar automáticamente;
- conservar diferencias de calidad, formato y proveedor.

### 35.4 Presupuesto antiguo

- mostrar aviso de antigüedad del coste;
- no actualizarlo automáticamente;
- permitir crear nueva versión.

### 35.5 Trabajo excepcional

- marcar aprendizaje como exclusivo del trabajo o cliente;
- evitar generalización.

### 35.6 Error del usuario al cerrar

- permitir corregir el cierre;
- conservar auditoría;
- recalcular aprendizajes derivados.

---

## 36. Roadmap sugerido

### Fase JCL-0 — Investigación y prototipo documental

- entrevistas con autónomos;
- clasificación de tipos de trabajo;
- definición de factores por oficio;
- ejemplos reales anonimizados;
- validación de cierre rápido.

### Fase JCL-1 — Base viva de precios

- extracción de líneas;
- observaciones históricas;
- aliases de proveedor;
- normalización básica de unidades;
- precio último y rango;
- sin asignación obligatoria a trabajos.

### Fase JCL-2 — Fotografía de costes del presupuesto

- costes de referencia;
- origen y fecha;
- cantidades;
- horas previstas;
- snapshot inmutable por versión.

### Fase JCL-3 — Cierre manual de trabajos

- horas reales;
- costes adicionales;
- incidencias;
- factores;
- comparación estimado frente a declarado;
- niveles de confianza.

### Fase JCL-4 — Reglas de aprendizaje

- trabajos similares por tipo y etiquetas;
- medianas de horas;
- avisos explicables;
- aplicación manual.

### Fase JCL-5 — Asistencia con IA

- notas de voz estructuradas;
- propuestas de factores;
- búsqueda semántica de trabajos parecidos;
- resumen de patrones;
- siempre con confirmación.

### Fase JCL-6 — Imputación opcional avanzada

Solo si los usuarios la demandan:

- vinculación parcial de líneas;
- materiales consumidos desde stock;
- repartos asistidos;
- subcontratación;
- coste por operario.

No convertir esta fase en requisito para utilizar el aprendizaje.

---

## 37. Métricas futuras

- porcentaje de facturas con líneas útiles para precios;
- artículos con precio confirmado reciente;
- tiempo medio para cerrar un trabajo;
- porcentaje de trabajos cerrados;
- desviación media de horas;
- frecuencia de recomendaciones aplicadas;
- reducción de presupuestos con margen bajo;
- porcentaje de avisos ignorados;
- número de aprendizajes corregidos;
- precisión percibida por el usuario;
- uso del modo rápido frente al detallado.

---

## 38. Criterios de aceptación de la futura V1

La primera versión funcional se considerará válida si:

- una factura de proveedor puede actualizar precios sin asignarse a trabajos;
- el usuario puede confirmar aliases y unidades;
- se conserva histórico de precios;
- un presupuesto guarda su snapshot de costes;
- un trabajo puede cerrarse registrando horas y desviaciones sin repartir facturas;
- el sistema distingue margen previsto y estimado;
- se pueden crear aprendizajes confirmados;
- un presupuesto futuro puede mostrar avisos basados en trabajos similares;
- los avisos muestran evidencia;
- ninguna recomendación cambia importes automáticamente;
- los documentos emitidos no se modifican;
- los datos contables y operativos no se duplican ni confunden.

---

## 39. Límites estrictos para la tarea documental actual

Esta especificación no autoriza implementación inmediata.

No hacer ahora:

- no crear migraciones;
- no crear tablas;
- no modificar Supabase;
- no crear OCR nuevo;
- no modificar producción;
- no crear endpoints;
- no activar IA;
- no crear inventario;
- no modificar planes ni precios;
- no tocar facturas emitidas;
- no integrar compras con trabajos automáticamente;
- no abrir una fase funcional activa;
- no mezclarlo con tareas fiscales o VeriFactu en curso.

---

## 40. Ubicación recomendada en el repositorio

Archivo sugerido:

`docs/product/job-cost-learning-and-price-intelligence-v1.md`

Alternativa si el repositorio separa investigación:

`docs/research/job-cost-learning-and-price-intelligence-v1.md`

Añadir referencia en:

- índice documental;
- roadmap futuro;
- bloque de producto para profesionales por encargo;
- estudio de necesidades por oficio.

Dependencias documentales relacionadas:

- estudio de necesidades de facturación por oficio;
- programa de partners para gestorías;
- estrategia de adquisición y competencia;
- control de gastos mediante extracción inteligente;
- presupuestos y versiones;
- trabajos, partes y ampliaciones;
- permisos y auditoría.

---

## 41. Instrucción resumida para Codex

Añadir esta especificación como documentación futura. No implementar código.

La decisión de arquitectura más importante que debe quedar reflejada en el roadmap es:

> La memoria de costes no dependerá de repartir cada factura de proveedor entre trabajos. Las facturas alimentarán una base histórica de precios; los trabajos aprenderán principalmente de sus snapshots, horas reales, cantidades ajustadas, incidencias y costes adicionales confirmados. La imputación directa de compras será opcional y posterior.

Validaciones recomendadas:

- `git diff --check`;
- validaciones documentales existentes;
- confirmación de que no se añadieron migraciones;
- no desplegar;
- no tocar producción.

---

## 42. Mensaje de producto resultante

> **El programa no te obliga a llevar un almacén perfecto ni te impone una tarifa. Recuerda cuánto te costaron los materiales y qué ocurrió en trabajos parecidos para ayudarte a no volver a presupuestar por debajo.**
