# CONSTRUCTION_SPECIALIST_TRADES_BILLING_NEEDS_V1

> Documento de investigacion futura. No implica implementacion inmediata ni compromiso comercial. Cualquier desarrollo derivado debera validarse con datos reales anonimizados, revision tecnica, revision legal/fiscal cuando aplique y respeto a la integridad documental de Factura Autonomo.

## Necesidades legales, documentales y operativas de facturación para gremios especialistas de obra, instalación y reparación

**Estado:** `FUTURE / RESEARCH / NOT IMPLEMENTED`
**Fecha de referencia:** 2026-06-25
**Producto:** Facturación Autónomos
**Ubicación sugerida:** `docs/research/construction-specialist-trades-billing-needs-v1.md`
**Ámbito inicial:** España, territorio común, sujeto a revisión legal, fiscal, técnica y autonómica antes de implementación.

---

## 0. Relación con el estudio general anterior

Este documento es un **anexo sectorial y una ampliación técnica** del estudio general previamente planteado sobre necesidades de facturación por oficio:

- nombre conceptual anterior: `ESTUDIO_NECESIDADES_FACTURACION_OFICIOS_V1`;
- nombre de archivo recomendado para el documento padre: `docs/research/vertical-billing-needs-research-v1.md`;
- nombre alternativo si el repositorio ya utiliza otra convención: documento de investigación sobre verticalización, gremios o necesidades de facturación sectoriales.

**Nota de incorporación:** no se ha localizado todavía un documento padre físico
en `docs/research` ni en `docs` con ese nombre o contenido equivalente. Para no
duplicar el estudio general, este anexo queda registrado bajo la iniciativa padre
`VERTICAL_BILLING_NEEDS_RESEARCH_V1`. Queda pendiente crear o consolidar el
índice/documento general y enlazarlo aquí cuando exista.

La función de este documento no es sustituir al estudio general. Su función es:

1. aterrizar la metodología en el primer sector;
2. definir una arquitectura reutilizable;
3. separar necesidades legales de necesidades profesionales;
4. especificar cinco perfiles iniciales;
5. preparar pruebas con usuarios reales;
6. aportar resultados al documento padre.

### Instrucción para Codex

Al incorporar este archivo:

- localizar el documento general anterior por nombre o contenido;
- añadir en el documento padre una referencia a este estudio como primer anexo sectorial;
- añadir en este documento un enlace relativo al documento padre real;
- no duplicar el documento general si ya existe;
- si todavía no existe físicamente, registrar este archivo bajo la iniciativa padre `VERTICAL_BILLING_NEEDS_RESEARCH_V1` y dejar una tarea documental para crear o consolidar el índice general.

Relación conceptual:

```text
VERTICAL_BILLING_NEEDS_RESEARCH_V1
└── CONSTRUCTION_SPECIALIST_TRADES_BILLING_NEEDS_V1
    ├── BLIND_INSTALLER_PROFILE
    ├── PLUMBER_PROFILE
    ├── PAINTER_PROFILE
    ├── MASON_PROFILE
    └── ELECTRICIAN_PROFILE
```

---

# 1. Resumen ejecutivo

Facturación Autónomos no debería crear un único “modo construcción” ni un programa diferente para cada profesión.

La arquitectura recomendada es:

> Una base común de clientes, trabajos, presupuestos, facturas, cobros e integridad documental, combinada con perfiles de oficio y contextos legales independientes.

El primer segmento de investigación será:

> **Autónomos y microempresas especialistas en obra, instalación, reparación y mantenimiento por encargo.**

Quedan fuera del foco inicial:

- empresas de multirreformas que coordinan todos los gremios;
- constructoras generales;
- promotoras;
- grandes instaladoras;
- comercios con TPV;
- hostelería;
- talleres mecánicos;
- negocios basados principalmente en tickets rápidos.

Los cinco perfiles iniciales son:

1. Persianistas.
2. Fontaneros.
3. Pintores.
4. Albañiles o paletas.
5. Electricistas.

Estos profesionales comparten un ciclo general:

```text
Solicitud
→ visita o diagnóstico
→ medición y fotografías
→ presupuesto
→ aceptación
→ anticipo
→ ejecución
→ imprevistos o ampliaciones
→ cierre del trabajo
→ factura
→ cobro
→ garantía
→ aprendizaje
```

Sin embargo, sus datos de trabajo, unidades, documentación técnica y motivos de desviación son diferentes.

La decisión central de producto es:

> **El gremio configura cómo se trabaja; el contexto concreto del encargo determina cómo se documenta y factura.**

---

# 2. Objetivos

## 2.1 Objetivos de investigación

- Comprender cómo trabaja realmente cada gremio.
- Identificar documentos obligatorios, habituales y opcionales.
- Separar obligaciones nacionales, autonómicas, contractuales y técnicas.
- Detectar necesidades que no aparecen en un programa de facturación genérico.
- Diseñar pruebas precisas con profesionales reales.
- Validar qué elementos deben formar parte del núcleo y cuáles son módulos verticales.
- Evitar crear funciones basadas solo en suposiciones internas.

## 2.2 Objetivos de producto

- Mantener una única base de software.
- Adaptar formularios, vocabulario, unidades y documentos al oficio.
- Evitar imponer precios fijos.
- Permitir presupuestos contextuales y totalmente editables.
- Conservar versiones, aceptaciones, extras y documentos emitidos.
- Ayudar a aplicar el tratamiento fiscal correcto sin decidirlo únicamente por el oficio.
- Facilitar trabajos para particulares, comunidades, empresas, aseguradoras y contratistas.
- Preparar el sistema para aprendizaje de trabajos y vigilancia de costes.

## 2.3 Objetivos de validación

- Realizar pruebas con trabajos reales anonimizados.
- Detectar campos que faltan y campos que sobran.
- Medir fricción y tiempo.
- Identificar qué información vive actualmente en WhatsApp, fotografías, papel o Excel.
- Comprobar si el profesional entiende el lenguaje del programa.
- Validar la secuencia presupuesto–anticipo–trabajo–extras–factura.

---

# 3. No objetivos

Este documento no autoriza:

- implementar ahora perfiles de oficio;
- construir un ERP de construcción;
- desarrollar prevención de riesgos laborales completa;
- sustituir software técnico reglamentario;
- emitir certificados técnicos no válidos;
- aplicar automáticamente un tipo de IVA sin confirmación;
- ofrecer asesoramiento fiscal definitivo;
- gestionar contabilidad de obra completa;
- controlar almacenes o inventario avanzado;
- coordinar todos los gremios de una reforma;
- crear precios oficiales o no editables;
- automatizar reclamaciones;
- tocar producción, Stripe, Supabase o Vercel.

---

# 4. Principios de diseño

## 4.1 No existe un único “modo construcción”

“Construcción” es demasiado amplio. El programa debe modelar:

- oficio;
- tipo de trabajo;
- destinatario;
- inmueble;
- relación contractual;
- modalidad de precio;
- requisitos documentales.

## 4.2 El oficio no determina el IVA

Un pintor puede trabajar:

- para un particular en una vivienda;
- para una comunidad;
- para una empresa;
- en un local;
- como subcontratista;
- en mantenimiento;
- en obra nueva.

El perfil `PAINTER` no puede seleccionar por sí mismo el tipo de IVA.

## 4.3 El objeto central es el trabajo

Para estos profesionales, la factura es la salida final de un proceso. La entidad principal debe ser `job`, no únicamente `invoice`.

## 4.4 Los precios son orientativos y editables

El programa puede ofrecer:

- costes históricos;
- precios de referencia;
- horas estimadas;
- modificadores;
- rangos;
- avisos de margen.

Nunca debe imponer una tarifa no editable.

## 4.5 El contexto se fotografía

Al emitir o aceptar documentos relevantes, se debe guardar un snapshot de:

- datos;
- tipo fiscal elegido;
- declaraciones;
- costes de referencia;
- versión del presupuesto;
- condiciones;
- documentos adjuntos.

Los cambios posteriores no deben alterar el histórico.

## 4.6 Legalidad asistida, no falsa automatización

El sistema debe:

- preguntar;
- explicar;
- solicitar evidencia;
- advertir;
- bloquear solo cuando una regla de producto lo justifique;
- permitir revisión autorizada;
- conservar trazabilidad.

No debe afirmar que una operación es legalmente correcta únicamente porque el usuario completó un asistente.

## 4.7 Configuración progresiva

Un fontanero que repara grifos no necesita ver formularios de gas o RITE. Un electricista no debe completar certificados en cada cambio de mecanismo.

Los módulos avanzados se activan por:

- capacidad profesional;
- tipo de intervención;
- alcance;
- comunidad autónoma;
- requisitos declarados.

---

# 5. Modelo de configuración en cuatro ejes

Cada trabajo combinará al menos cuatro ejes independientes:

```text
tradeProfile
legalContext
pricingMethod
documentRequirements
```

## 5.1 `tradeProfile`

Ejemplos:

- `BLIND_INSTALLER`
- `PLUMBER`
- `PAINTER`
- `MASON`
- `ELECTRICIAN`

## 5.2 `legalContext`

Valores iniciales propuestos:

- `PRIVATE_HOME_RENOVATION_OR_REPAIR`
- `PRIVATE_HOME_MAINTENANCE`
- `RENTED_PROPERTY`
- `COMMUNITY_OF_OWNERS`
- `COMMERCIAL_OR_PROFESSIONAL_PREMISES`
- `INSURANCE_CLAIM`
- `NEW_BUILD`
- `FORMAL_REHABILITATION`
- `CONSTRUCTION_SUBCONTRACT`
- `BUSINESS_TO_BUSINESS_SERVICE`
- `PUBLIC_ADMINISTRATION`
- `UNKNOWN_NEEDS_REVIEW`

## 5.3 `pricingMethod`

- `CUSTOM_FIXED_PRICE`
- `MEASURED_UNITS`
- `TIME_AND_MATERIALS`
- `DAY_RATE`
- `PROJECT_MILESTONES`
- `PARTIAL_CERTIFICATIONS`
- `RECURRING_MAINTENANCE`
- `MIXED`

## 5.4 `documentRequirements`

Ejemplos:

- `SITE_VISIT_REPORT`
- `QUOTE`
- `QUOTE_WAIVER`
- `CUSTOMER_ACCEPTANCE`
- `CONSUMER_INFORMATION`
- `START_AUTHORIZATION`
- `ADVANCE_INVOICE`
- `VARIATION_ORDER`
- `WORK_REPORT`
- `COMPLETION_REPORT`
- `WARRANTY`
- `TECHNICAL_CERTIFICATE`
- `CONTRACTOR_DECLARATION`
- `REVERSE_CHARGE_INVOICE`
- `PHOTO_EVIDENCE`
- `MATERIAL_COST_DECLARATION`
- `PAYMENT_RECEIPT`

## 5.5 Ejemplo: persianista en vivienda particular

```yaml
tradeProfile: BLIND_INSTALLER
legalContext: PRIVATE_HOME_RENOVATION_OR_REPAIR
pricingMethod: CUSTOM_FIXED_PRICE
documentRequirements:
  - SITE_VISIT_REPORT
  - QUOTE
  - CUSTOMER_ACCEPTANCE
  - ADVANCE_INVOICE
  - WORK_REPORT
  - WARRANTY
  - PHOTO_EVIDENCE
```

## 5.6 Ejemplo: el mismo persianista subcontratado

```yaml
tradeProfile: BLIND_INSTALLER
legalContext: CONSTRUCTION_SUBCONTRACT
pricingMethod: MEASURED_UNITS
documentRequirements:
  - CONTRACTOR_DECLARATION
  - WORK_REPORT
  - PHOTO_EVIDENCE
  - REVERSE_CHARGE_INVOICE
```

---

# 6. Matriz legal y fiscal común

> Esta sección es una especificación de producto basada en fuentes oficiales, no un dictamen fiscal. Debe revisarse antes de implementar y actualizarse por territorio.

## 6.1 Obras de renovación o reparación en viviendas

Regla general:

- IVA general del 21 %.

Posible tipo reducido del 10 % cuando se cumplan conjuntamente, entre otros, los requisitos informados por la AEAT:

- destinatario persona física que utilice la vivienda para uso particular, o comunidad de propietarios;
- construcción o rehabilitación finalizada al menos dos años antes;
- materiales aportados por quien ejecuta la obra no superiores al 40 % de la base imponible.

### Requisitos de producto

Crear `HousingRepairVatAssessment` con:

- destinatario jurídico;
- tipo de destinatario;
- uso declarado del inmueble;
- comunidad de propietarios;
- fecha o antigüedad declarada del edificio;
- coste estimado de materiales;
- base estimada;
- porcentaje de materiales;
- resultado provisional;
- evidencia o declaración;
- usuario que confirmó;
- fecha;
- resultado final antes de facturar.

### Revalidación

El cálculo debe ejecutarse:

1. al crear el presupuesto;
2. al aceptar el presupuesto;
3. antes de emitir factura;
4. cuando cambien materiales o base.

### Regla de seguridad

No dividir artificialmente una única ejecución entre materiales y mano de obra para forzar tipos distintos cuando legalmente deba tratarse como una operación conjunta.

## 6.2 Mantenimiento frente a reparación o renovación

El sistema debe diferenciar:

- reparación puntual;
- renovación;
- instalación;
- mantenimiento preventivo;
- mantenimiento periódico;
- contrato de mantenimiento.

No debe sugerir automáticamente el 10 % por realizarse en una vivienda.

## 6.3 Vivienda alquilada o uso profesional

Separar:

- propietario;
- ocupante;
- contratante;
- destinatario de factura;
- pagador;
- dirección de ejecución;
- dirección fiscal.

El asistente debe advertir que el uso por el destinatario es relevante y solicitar revisión cuando la vivienda esté alquilada o afectada a una actividad.

## 6.4 Comunidades de propietarios

Necesidades:

- razón social o denominación de la comunidad;
- NIF;
- presidente o administrador como contacto;
- inmueble y elemento común afectado;
- acuerdo o autorización;
- datos del pagador;
- reparto o subcuentas solo si se incorpora en el futuro;
- adjuntos.

## 6.5 Reparaciones y aseguradoras

Separar:

- asegurado;
- propietario;
- ocupante;
- aseguradora;
- número de siniestro;
- contratante;
- destinatario jurídico;
- pagador;
- franquicia;
- autorización;
- parte asumida por cliente.

El hecho de existir un seguro no determina por sí solo el tipo fiscal.

## 6.6 Construcción, ampliación y rehabilitación

No usar “rehabilitación” como sinónimo libre de reforma.

Requisitos de producto:

- clasificación pendiente de confirmación;
- descripción del alcance;
- promotor;
- contratista;
- documentación aportada;
- declaración del destinatario;
- revisión de asesoría cuando proceda.

## 6.7 Inversión del sujeto pasivo en ejecuciones de obra

Para determinados trabajos de urbanización, construcción o rehabilitación entre empresarios, incluida la cadena de contratistas y subcontratistas en los supuestos legales, puede aplicar inversión del sujeto pasivo.

### No permitir

Un interruptor genérico:

```text
[ ] Factura sin IVA
```

### Flujo recomendado

1. Identificar destinatario empresario o profesional.
2. Identificar promotor.
3. Identificar contratista que encarga.
4. Identificar obra.
5. Clasificar construcción, urbanización o rehabilitación.
6. Registrar comunicación expresa y fehaciente.
7. Adjuntar documento o evidencia.
8. Confirmación por usuario autorizado.
9. Generar factura con la mención reglamentaria correspondiente.
10. Conservar snapshot y auditoría.

### Estado

- `NOT_APPLICABLE`
- `PENDING_EVIDENCE`
- `PENDING_REVIEW`
- `CONFIRMED`
- `REJECTED`
- `OVERRIDDEN_WITH_REASON`

## 6.8 Anticipos

El flujo debe admitir:

```text
Presupuesto
→ aceptación
→ cobro anticipado
→ factura de anticipo
→ trabajo
→ factura final con referencia al anticipo
```

No registrar una señal solo como movimiento de caja sin documento cuando exista obligación de facturarla.

## 6.9 Factura completa y simplificada

Para estos gremios:

- utilizar factura completa por defecto;
- permitir factura simplificada en los supuestos legales;
- no asumir que el umbral de 3.000 € se aplica de forma general a estos oficios;
- validar el límite general y la naturaleza de la operación.

## 6.10 Contenido de factura

La capa común debe soportar:

- número y serie;
- fecha;
- emisor;
- destinatario;
- NIF;
- descripción suficiente;
- base;
- tipo;
- cuota;
- fecha de operación si difiere;
- menciones especiales;
- referencias a anticipos o rectificaciones;
- integridad y snapshot.

## 6.11 Protección del consumidor y normativa territorial

Las obligaciones sobre:

- presupuesto;
- renuncia;
- orden de trabajo;
- extras;
- garantías;
- información;
- registros industriales;
- hojas de reclamaciones;

pueden variar por comunidad autónoma.

### Arquitectura recomendada

```text
consumerRules:
  country
  autonomousCommunity
  serviceLocation
  contractChannel
  consumerOrBusiness
  urgentRepair
  ruleSetVersion
```

El sistema no debe codificar como norma nacional una regla obtenida de una única comunidad autónoma.

## 6.12 Contratos fuera del establecimiento

Cuando la contratación se produce en casa del cliente, el sistema debe poder registrar:

- lugar y canal de contratación;
- información entregada;
- solicitud de inicio anticipado cuando proceda;
- reparación urgente;
- copia en soporte duradero;
- aceptación y fecha.

El detalle debe someterse a revisión legal antes de crear automatismos.

## 6.13 Pagos en efectivo

Si alguna parte actúa como empresario o profesional, el sistema debe vigilar el límite general aplicable al total de la operación y evitar que el fraccionamiento de cobros o facturas oculte la operación real.

Datos:

- total de operación;
- cobros acumulados;
- método;
- excepción aplicable;
- advertencia;
- confirmación;
- evidencia.

---

# 7. Núcleo funcional común

## 7.1 Entidad `job`

Debe agrupar:

- cliente;
- roles de las partes;
- dirección de ejecución;
- solicitudes;
- visitas;
- mediciones;
- fotografías;
- notas;
- presupuesto y versiones;
- aceptación;
- anticipo;
- agenda;
- partes;
- horas;
- materiales;
- imprevistos;
- extras;
- documentos técnicos;
- factura;
- cobros;
- garantía;
- cierre;
- aprendizaje.

## 7.2 Estados sugeridos

- `LEAD`
- `VISIT_PENDING`
- `MEASURED_OR_DIAGNOSED`
- `QUOTE_DRAFT`
- `QUOTE_SENT`
- `QUOTE_ACCEPTED`
- `ADVANCE_PENDING`
- `SCHEDULED`
- `IN_PROGRESS`
- `BLOCKED`
- `VARIATION_PENDING`
- `COMPLETED_PENDING_ACCEPTANCE`
- `READY_TO_INVOICE`
- `INVOICED`
- `PARTIALLY_PAID`
- `PAID`
- `UNDER_WARRANTY`
- `CLOSED`
- `CANCELLED`

## 7.3 Roles de las partes

Una sola ficha “cliente” es insuficiente.

Modelar:

- contratante;
- destinatario de factura;
- propietario;
- ocupante;
- pagador;
- aseguradora;
- comunidad;
- administrador;
- promotor;
- contratista principal;
- subcontratista;
- responsable de obra;
- contacto de acceso.

## 7.4 Dirección de trabajo

Separada de dirección fiscal:

- dirección;
- coordenadas opcionales;
- planta;
- puerta;
- acceso;
- aparcamiento;
- horarios;
- contacto;
- restricciones;
- fotografías;
- notas de seguridad.

## 7.5 Presupuestos versionados

Cada versión debe conservar:

- alcance;
- exclusiones;
- unidades;
- cantidades;
- costes internos;
- precios;
- impuestos;
- fotos;
- condiciones;
- validez;
- versión;
- aceptación;
- firma o evidencia;
- hash o mecanismo de integridad.

## 7.6 Extras y ampliaciones

Nunca añadir silenciosamente un extra a la factura.

Flujo:

```text
Imprevisto detectado
→ clasificación
→ propuesta de ampliación
→ importe/plazo
→ evidencia
→ aceptación
→ ejecución
→ incorporación a factura
```

Clasificaciones:

- error de estimación interno;
- condición oculta;
- petición del cliente;
- cambio de alcance;
- urgencia;
- trabajo de otro gremio;
- material sustituido;
- no facturable.

## 7.7 Anticipos y cobros parciales

- señal;
- pago por materiales;
- hito;
- certificación;
- saldo final;
- retención comercial pactada;
- cobro parcial;
- devolución.

## 7.8 Cierre del trabajo

Formulario:

- horas previstas y reales;
- materiales previstos y reales;
- incidencias;
- extras;
- trabajos pendientes;
- fotografías finales;
- aceptación;
- documentos entregados;
- garantía;
- coste y margen estimados;
- aprendizaje confirmado.

---

# 8. Perfil `BLIND_INSTALLER`

## 8.1 Solicitud y visita

Campos:

- tipo de actuación;
- número de huecos;
- estancia;
- dirección;
- contacto;
- urgencia;
- fotografías iniciales;
- persiana existente;
- síntoma o necesidad;
- reparación, sustitución o instalación nueva.

## 8.2 Medición

Por hueco:

- identificador;
- ancho de obra;
- alto de obra;
- medida de fabricación;
- holguras;
- cajón;
- eje;
- guías;
- lama;
- material;
- color;
- recogedor;
- cinta;
- motor;
- mando;
- accesibilidad;
- altura;
- orientación;
- observaciones;
- fotografías;
- confirmación de medida.

## 8.3 Contexto de instalación

- obra nueva;
- vivienda habitada;
- local;
- comunidad;
- cortinas;
- muebles;
- animales;
- protección especial;
- desmontaje;
- retirada;
- albañilería;
- adaptación de guías;
- acceso;
- escalera o medios auxiliares;
- segundo operario;
- aparcamiento;
- distancia.

## 8.4 Presupuesto

Separar internamente:

- material;
- fabricación;
- accesorios;
- motor;
- desmontaje;
- instalación;
- adaptación;
- retirada;
- desplazamiento;
- dificultad;
- contingencia;
- margen.

La línea comercial puede agrupar el resultado.

## 8.5 Ejecución

- medidas finales;
- referencia instalada;
- serie del motor;
- accesorios;
- tiempo;
- operarios;
- incidencias;
- material adicional;
- adaptación;
- fotos antes/después;
- prueba;
- explicación al cliente.

## 8.6 Cierre

- parte;
- conformidad;
- manual;
- garantía;
- mandos entregados;
- elementos retirados;
- pendientes;
- aprendizaje.

## 8.7 Motivos de desviación

- medida incorrecta;
- hueco irregular;
- guías deterioradas;
- cajón inaccesible;
- cortinas o mobiliario;
- cableado no previsto;
- albañilería;
- segundo operario;
- retorno;
- aparcamiento;
- cliente ausente;
- material equivocado;
- animales o protección del entorno.

---

# 9. Perfil `PLUMBER`

## 9.1 Solicitud

- urgencia;
- fuga;
- atasco;
- falta de presión;
- aparato;
- instalación;
- mantenimiento;
- siniestro;
- fotografías;
- disponibilidad de corte;
- riesgo activo.

## 9.2 Diagnóstico

- origen aparente;
- origen confirmado;
- tubería vista u oculta;
- material;
- zona;
- acceso;
- demolición necesaria;
- daños;
- humedad;
- vecino o comunidad afectada;
- aseguradora;
- posibilidad de reparación inmediata.

## 9.3 Presupuesto

- salida;
- diagnóstico;
- mano de obra;
- materiales;
- apertura;
- reparación;
- pruebas;
- cierre provisional;
- segunda visita;
- exclusiones de albañilería/pintura;
- urgencia;
- desplazamiento.

## 9.4 Ejecución

- causa real;
- piezas;
- metros;
- válvulas;
- aparatos;
- pruebas;
- presión;
- estanqueidad;
- horas;
- desplazamientos;
- espera;
- autorizaciones;
- fotos.

## 9.5 Cierre

- informe;
- reparación;
- pruebas;
- resultado;
- recomendaciones;
- piezas;
- garantía;
- trabajos de otros gremios;
- posible seguimiento.

## 9.6 Módulos opcionales

Solo cuando corresponda:

- instalaciones de gas;
- instalaciones térmicas;
- RITE;
- certificados;
- memoria;
- mantenimiento reglamentario;
- empresa habilitada;
- técnico responsable.

No mostrar estos campos para una reparación básica.

## 9.7 Motivos de desviación

- avería oculta;
- tubería diferente;
- acceso;
- corte general;
- segundo desplazamiento;
- pieza no disponible;
- apertura mayor;
- afectación a vecino;
- espera de aseguradora;
- prueba fallida;
- material incompatible.

---

# 10. Perfil `PAINTER`

## 10.1 Visita

- estancias;
- paredes;
- techos;
- puertas;
- carpinterías;
- metros estimados;
- altura;
- vivienda vacía, ocupada o amueblada;
- cantidad de muebles;
- protección;
- suelo;
- estado;
- humedad;
- grietas;
- desconchados;
- color actual;
- color nuevo;
- acabado;
- fotos.

## 10.2 Preparación

- mover muebles;
- agrupar;
- tapar;
- desmontar elementos;
- reparar;
- lijar;
- imprimar;
- retirar papel;
- tratar humedad;
- proteger zonas;
- limpieza.

## 10.3 Presupuesto

Métodos:

- precio cerrado;
- m²;
- jornada;
- estancia;
- mixto.

Variables:

- número de manos;
- cambio oscuro/claro;
- estado;
- muebles;
- altura;
- ocupación;
- tiempos de secado;
- material;
- desplazamiento;
- contingencia.

## 10.4 Ejecución

- preparación real;
- manos reales;
- reparaciones;
- cambios de color;
- espacios bloqueados;
- horas;
- material;
- retoques;
- fotografías.

## 10.5 Cierre

- superficies;
- colores y referencias;
- exclusiones;
- limpieza;
- fotos;
- aceptación;
- retoques pendientes;
- garantía acordada.

## 10.6 Motivos de desviación

- muebles no declarados;
- soporte en mal estado;
- humedad;
- manos extra;
- cambio de color;
- vivienda ocupada;
- retrasos de secado;
- acceso;
- trabajos añadidos;
- mala cobertura.

---

# 11. Perfil `MASON`

## 11.1 Visita y medición

- elemento;
- alcance;
- m²;
- m³;
- metros lineales;
- unidades;
- demolición;
- soporte;
- escombros;
- medios auxiliares;
- andamio;
- acceso;
- carga;
- contenedor;
- protección;
- operarios;
- fases;
- coordinación;
- planos;
- fotos.

## 11.2 Presupuesto

Modalidades:

- precio cerrado;
- unidad de obra;
- medición;
- jornada;
- administración;
- materiales + mano de obra;
- hitos;
- certificaciones parciales.

## 11.3 Ejecución

- medición ejecutada;
- jornadas;
- operarios;
- materiales;
- demoliciones;
- soporte oculto;
- paralizaciones;
- extras;
- fases;
- certificaciones;
- fotos;
- coordinación.

## 11.4 Cierre

- medición final;
- unidades;
- extras aceptados;
- hitos;
- repasos;
- fotos;
- conformidad;
- residuos;
- documentación.

## 11.5 Motivos de desviación

- medición inicial insuficiente;
- soporte oculto;
- demolición adicional;
- residuos;
- acceso;
- espera de otros gremios;
- tiempo de secado;
- falta de suministro;
- cambio de proyecto;
- medios auxiliares.

---

# 12. Perfil `ELECTRICIAN`

## 12.1 Solicitud y diagnóstico

- reparación;
- instalación;
- ampliación;
- mantenimiento;
- cuadro;
- circuito;
- potencia;
- puntos;
- mecanismos;
- canalización;
- protecciones;
- tierra;
- síntomas;
- riesgo;
- corte;
- instalación existente;
- fotos.

## 12.2 Presupuesto

- diagnóstico;
- materiales;
- puntos;
- metros;
- cuadro;
- protecciones;
- rozas/canalización;
- mano de obra;
- pruebas;
- documentación;
- exclusiones;
- trabajo de albañilería;
- desplazamiento.

## 12.3 Ejecución

- circuitos modificados;
- secciones;
- protecciones;
- materiales;
- mediciones;
- verificaciones;
- incidencias;
- horas;
- fotos;
- cambios.

## 12.4 Documentación técnica condicional

Según alcance:

- proyecto;
- memoria técnica;
- certificado de instalación;
- verificaciones;
- esquema;
- expediente;
- documentación autonómica;
- entrega al titular.

El sistema debe preguntar por características y permitir activar el conjunto documental correspondiente; no debe generar certificados reglamentarios sin cumplir los requisitos profesionales y formales aplicables.

## 12.5 Cierre

- verificaciones;
- resultados;
- esquema;
- certificado;
- expediente;
- documentación entregada;
- fotos;
- recomendaciones;
- aceptación.

## 12.6 Motivos de desviación

- instalación antigua;
- circuitos no identificados;
- canalización obstruida;
- cuadro insuficiente;
- tierra deficiente;
- albañilería;
- corte no disponible;
- documentación adicional;
- materiales incompatibles;
- ampliación de alcance.

---

# 13. Base común y módulos verticales

## 13.1 Base común

- clientes;
- roles;
- direcciones;
- trabajos;
- visitas;
- fotografías;
- presupuestos;
- versiones;
- aceptaciones;
- anticipos;
- facturas;
- cobros;
- gastos;
- proveedores;
- integridad documental;
- VeriFactu;
- rectificativas;
- auditoría;
- aprendizaje;
- vigilancia de precios;
- documentos adjuntos.

## 13.2 Configuración vertical

- vocabulario;
- formularios;
- unidades;
- listas de comprobación;
- modificadores de dificultad;
- documentos técnicos;
- preguntas de cierre;
- motivos de desviación;
- plantillas;
- informes;
- landings SEO futuras.

## 13.3 Habilitación cruzada

Un profesional puede añadir bloques de otro oficio sin cambiar su perfil principal.

Ejemplo:

- persianista con pequeña albañilería;
- fontanero con pintura excluida;
- electricista con rozas;
- albañil que coordina una certificación eléctrica externa.

Debe distinguirse:

- trabajo propio;
- trabajo subcontratado;
- trabajo excluido;
- trabajo pendiente de otro gremio.

---

# 14. Arquitectura técnica conceptual

## 14.1 Capas

```text
Billing & Document Integrity Core
        |
        +-- Job Management Core
        |
        +-- Legal Context Engine
        |
        +-- Trade Profile Engine
        |
        +-- Pricing & Cost Intelligence
        |
        +-- Document Template Engine
        |
        +-- Test & Research Instrumentation
```

## 14.2 `Trade Profile Engine`

Responsable de:

- esquema de campos;
- orden de formularios;
- unidades;
- plantillas;
- terminología;
- validaciones de oficio;
- listas de cierre;
- motivos de desviación.

No calcula impuestos por sí solo.

## 14.3 `Legal Context Engine`

Responsable de:

- preguntas fiscales;
- evidencia;
- rule-set versionado;
- alertas;
- menciones;
- requisitos documentales;
- snapshot;
- revisión.

No sustituye la decisión profesional.

## 14.4 `Document Template Engine`

Debe generar:

- presupuesto;
- aceptación;
- factura de anticipo;
- ampliación;
- parte;
- finalización;
- garantía;
- factura;
- certificado solo cuando exista plantilla válida y habilitación.

## 14.5 Regla de versionado

Cada documento debe registrar:

- template version;
- rule-set version;
- datos;
- usuario;
- fecha;
- origen;
- aceptación;
- hash/integridad;
- reemplazos o rectificaciones.

---

# 15. Modelo conceptual de datos

No crear migraciones en esta fase.

## `trade_profiles`

- `id`
- `code`
- `version`
- `display_name`
- `schema`
- `enabled_modules`
- `status`

## `tenant_trade_capabilities`

- `id`
- `tenant_id`
- `trade_profile_id`
- `primary`
- `capabilities`
- `licenses_or_certifications`
- `active`

## `jobs`

- `id`
- `tenant_id`
- `trade_profile_id`
- `legal_context_id`
- `pricing_method`
- `status`
- `title`
- `summary`
- `opened_at`
- `completed_at`
- `closed_at`

## `job_parties`

- `id`
- `job_id`
- `party_id`
- `role`
- `legal_recipient`
- `payer`
- `contact`

## `job_sites`

- `id`
- `job_id`
- `address`
- `property_use`
- `occupancy`
- `access_data`
- `autonomous_community`
- `notes`

## `job_trade_data`

- `id`
- `job_id`
- `profile_code`
- `profile_version`
- `data`
- `validated_at`

## `job_visits`

- `id`
- `job_id`
- `scheduled_at`
- `performed_at`
- `type`
- `notes`
- `measurements`
- `diagnosis`

## `job_media`

- `id`
- `job_id`
- `visit_id`
- `type`
- `caption`
- `captured_at`
- `storage_reference`
- `consent_status`

## `legal_context_assessments`

- `id`
- `job_id`
- `context_type`
- `rule_set_version`
- `answers`
- `result`
- `confidence`
- `requires_review`
- `confirmed_by`
- `confirmed_at`

## `tax_assessment_snapshots`

- `id`
- `job_id`
- `quote_version_id`
- `invoice_id`
- `tax_treatment`
- `tax_rate`
- `materials_cost`
- `tax_base`
- `materials_percentage`
- `evidence`
- `rule_set_version`
- `created_at`

## `customer_declarations`

- `id`
- `job_id`
- `type`
- `content_version`
- `signed_by`
- `signed_at`
- `evidence`
- `status`

## `quote_versions`

- `id`
- `job_id`
- `version`
- `pricing_method`
- `scope`
- `exclusions`
- `internal_cost_snapshot`
- `tax_snapshot`
- `total`
- `valid_until`
- `status`
- `accepted_at`

## `job_variations`

- `id`
- `job_id`
- `quote_version_id`
- `reason_type`
- `description`
- `cost_impact`
- `price_impact`
- `time_impact`
- `evidence`
- `status`
- `accepted_at`

## `work_logs`

- `id`
- `job_id`
- `user_id`
- `date`
- `hours`
- `travel`
- `materials`
- `notes`
- `source`

## `technical_documents`

- `id`
- `job_id`
- `document_type`
- `template_version`
- `professional_id`
- `status`
- `issued_at`
- `storage_reference`

## `job_closeouts`

- `id`
- `job_id`
- `estimated_vs_actual`
- `incidents`
- `pending_items`
- `customer_acceptance`
- `warranty`
- `lesson_candidates`
- `closed_at`

## `trade_research_sessions`

- `id`
- `trade_profile_id`
- `participant_profile`
- `scenario`
- `task_metrics`
- `findings`
- `consent`
- `created_at`

---

# 16. Reglas de interfaz

## 16.1 Onboarding

Preguntar:

1. Oficio principal.
2. Trabajos habituales.
3. Particular, empresa, comunidad, aseguradora o contratista.
4. Si entra en obras.
5. Si tiene empleados.
6. Capacidades técnicas opcionales.
7. Comunidad autónoma.
8. Forma habitual de presupuestar.
9. Uso de anticipos.
10. Documentos actuales.

No mostrar todos los módulos desde el primer día.

## 16.2 Creación de trabajo

Secuencia dinámica:

```text
¿Qué vas a hacer?
¿Para quién?
¿Dónde?
¿En qué contexto?
¿Cómo lo presupuestas?
¿Qué documentos necesitas?
```

## 16.3 Progressive disclosure

- campos esenciales visibles;
- avanzados plegados;
- módulos técnicos solo cuando aplican;
- explicación en lenguaje del gremio;
- opción “no lo sé / revisar”.

## 16.4 Alertas

Distinguir:

- información;
- recomendación;
- advertencia;
- bloqueo;
- revisión requerida.

No usar lenguaje alarmista.

---

# 17. Investigación con usuarios reales

## 17.1 Muestra inicial

Cinco participantes por gremio:

1. Autónomo solo, principalmente particulares.
2. Autónomo mixto, particulares y empresas.
3. Profesional de comunidades, administradores o seguros.
4. Subcontratista de obra.
5. Microempresa con uno a cinco empleados.

Total inicial:

- 5 persianistas;
- 5 fontaneros;
- 5 pintores;
- 5 albañiles/paletas;
- 5 electricistas.

**25 sesiones profundas.**

## 17.2 Criterios de selección

Recoger variedad de:

- experiencia;
- edad;
- capacidad digital;
- comunidad autónoma;
- tamaño;
- forma de presupuestar;
- tipo de cliente;
- uso de gestoría;
- herramientas actuales.

## 17.3 Trabajo real anonimizado

Cada participante debe reconstruir un trabajo reciente:

1. Solicitud.
2. Cliente.
3. Lugar.
4. Visita.
5. Fotos.
6. Mediciones o diagnóstico.
7. Presupuesto.
8. Cambio.
9. Aceptación.
10. Anticipo.
11. Ejecución.
12. Imprevisto.
13. Extra.
14. Horas y materiales.
15. Cierre.
16. Factura.
17. Cobro.
18. Garantía.
19. Información fuera del sistema.

## 17.4 Preguntas de entrevista

- ¿Cómo empezó el trabajo?
- ¿Qué necesitabas saber antes de dar precio?
- ¿Qué no pudiste comprobar?
- ¿Cómo calculaste?
- ¿Qué cambió?
- ¿Qué no cobraste?
- ¿Qué documento te pidió el cliente?
- ¿Qué te pidió la gestoría?
- ¿Qué guardaste en WhatsApp?
- ¿Qué fotografías fueron importantes?
- ¿Qué habrías querido recordar al presupuestar?
- ¿Cómo supiste el IVA?
- ¿Qué parte fue más lenta?
- ¿Cuándo consideraste terminado el trabajo?

## 17.5 Métricas

- tiempo por tarea;
- errores;
- abandonos;
- campos omitidos;
- correcciones;
- ayudas consultadas;
- lenguaje incomprendido;
- duplicaciones;
- uso de “otros”;
- documentos faltantes;
- satisfacción;
- confianza;
- intención de uso.

## 17.6 Evidencia cualitativa

Registrar:

- citas anonimizadas;
- capturas autorizadas;
- documentos modelo;
- vocabulario;
- atajos;
- excepciones;
- decisiones de diseño.

## 17.7 Privacidad

- consentimiento explícito;
- datos anonimizados;
- no subir facturas reales sin base y autorización;
- eliminar NIF, nombres, direcciones y cuentas;
- no usar fotografías identificativas sin permiso;
- definir retención.

---

# 18. Hipótesis a validar

## Comunes

- El usuario piensa en trabajos antes que en facturas.
- Presupuesto y parte son más centrales que catálogo.
- Los precios fijos son insuficientes.
- Las fotos forman parte del expediente.
- Los extras se gestionan mal.
- Los anticipos se documentan de forma irregular.
- Las funciones fiscales deben aparecer en el momento correcto.
- El mismo gremio tiene contextos legales distintos.

## Persianistas

- La medición por hueco es la unidad principal.
- El entorno de instalación explica gran parte de la desviación.
- Motor, mando y número de serie son datos de cierre útiles.

## Fontaneros

- Diagnóstico provisional y real deben separarse.
- Seguros y daños ocultos generan mucha complejidad.
- La segunda visita es un coste frecuente.

## Pintores

- El estado y la ocupación importan más que el m² aislado.
- Protección y preparación son los principales costes olvidados.
- La plantilla debe sugerir, no fijar.

## Albañiles

- Se necesitan múltiples métodos de cobro.
- Medición inicial y final deben coexistir.
- La coordinación produce desviaciones.

## Electricistas

- La documentación técnica condicional es un diferenciador.
- El programa debe ayudar a recopilar, no fingir emitir documentos oficiales sin requisitos.
- Pruebas y verificaciones deben formar parte del cierre.

---

# 19. Orden de investigación recomendado

1. Persianistas.
2. Pintores.
3. Fontaneros.
4. Electricistas.
5. Albañiles/paletas.

Motivo:

- comenzar con un gremio conocido;
- validar el núcleo;
- añadir variabilidad contextual;
- incorporar seguros y diagnóstico;
- introducir documentación reglamentaria;
- terminar con mediciones y fases complejas.

---

# 20. Roadmap futuro

## `VBN-0` — Consolidación del estudio general

- localizar o crear documento padre;
- índice de sectores;
- metodología común;
- taxonomía;
- plantillas de investigación.

## `CST-0` — Investigación documental

- validar fuentes;
- mapa nacional/autonómico;
- entrevistas;
- documentos reales anonimizados.

## `CST-1` — Modelo común de trabajo

- job;
- roles;
- dirección;
- visitas;
- fotos;
- presupuestos versionados;
- extras;
- cierre.

## `CST-2` — Perfil persianistas piloto

- formularios;
- medición;
- contexto;
- parte;
- garantía;
- 5 pruebas.

## `CST-3` — Perfil pintores piloto

- superficies;
- preparación;
- modificadores;
- cierre;
- 5 pruebas.

## `CST-4` — Perfil fontaneros piloto

- diagnóstico;
- seguros;
- pruebas;
- segunda visita;
- 5 pruebas.

## `CST-5` — Perfil electricistas piloto

- instalaciones;
- verificaciones;
- documentos;
- 5 pruebas.

## `CST-6` — Perfil albañiles piloto

- mediciones;
- unidades;
- hitos;
- certificaciones;
- 5 pruebas.

## `CST-7` — Motor legal contextual

- IVA;
- anticipos;
- inversión;
- consumo;
- efectivo;
- rule sets versionados.

## `CST-8` — Validación transversal

- comparar gremios;
- extraer núcleo;
- eliminar campos innecesarios;
- priorizar módulos.

No abrir ninguna fase funcional hasta que producto, legal y roadmap lo aprueben expresamente.

---

# 21. Riesgos

## Sobrecarga de interfaz

Mitigación:

- configuración progresiva;
- perfiles;
- campos condicionales;
- pruebas.

## Fragmentación del producto

Mitigación:

- núcleo común;
- esquemas versionados;
- componentes compartidos;
- no crear aplicaciones separadas.

## Falsa seguridad fiscal

Mitigación:

- lenguaje prudente;
- evidencia;
- revisión;
- rule sets;
- auditoría;
- asesoría profesional.

## Normativa autonómica

Mitigación:

- matrices territoriales;
- no generalizar;
- versión y fecha;
- fuentes oficiales.

## Certificados técnicos inválidos

Mitigación:

- permisos;
- habilitación;
- plantillas controladas;
- no generar documentos oficiales sin condiciones.

## Datos de usuarios de prueba

Mitigación:

- anonimización;
- consentimiento;
- retención;
- acceso limitado.

## Intentar resolver demasiados gremios

Mitigación:

- pilotos secuenciales;
- criterios de salida;
- no implementar todo a la vez.

---

# 22. Requisitos no funcionales futuros

- aislamiento por empresa;
- RLS o equivalente;
- auditoría;
- cifrado;
- versionado;
- integridad;
- almacenamiento seguro de fotos;
- soporte móvil;
- modo de conexión limitada;
- accesibilidad;
- rendimiento;
- exportación;
- reversibilidad de configuración;
- reglas idempotentes;
- no alterar documentos históricos.

---

# 23. Criterios de aceptación de esta tarea documental

La tarea actual se considera completada cuando:

- existe este documento;
- se identifica como anexo del estudio general;
- el documento padre contiene una referencia;
- el índice documental se actualiza;
- se separa gremio de contexto legal;
- se describen los cinco perfiles;
- se define el núcleo común;
- se especifica la metodología de test;
- se incluye un modelo conceptual;
- se incluye un roadmap;
- se incluyen fuentes oficiales;
- se indica que no está implementado;
- no se toca código funcional;
- no se crean migraciones;
- no se modifica producción.

---

# 24. Límites estrictos para Codex

No hacer:

- no implementar perfiles;
- no crear tablas;
- no crear migraciones;
- no crear endpoints;
- no modificar IVA;
- no crear certificados;
- no tocar facturación real;
- no tocar VeriFactu;
- no tocar Stripe;
- no tocar Supabase;
- no tocar Vercel;
- no desplegar;
- no crear páginas públicas;
- no afirmar cumplimiento legal definitivo;
- no mezclarlo con una fase activa;
- no duplicar el documento padre;
- no inventar obligaciones autonómicas.

---

# 25. Instrucciones de incorporación para Codex

1. Crear:
   `docs/research/construction-specialist-trades-billing-needs-v1.md`

2. Localizar el documento padre sobre necesidades por oficio.

3. Añadir en el padre:

```markdown
## Estudios sectoriales

- [Oficios especialistas de construcción, instalación y reparación](./construction-specialist-trades-billing-needs-v1.md)
```

4. Añadir en este documento el enlace relativo real al padre.

5. Añadir la iniciativa al roadmap futuro bajo:

```text
Vertical Product Research
└── Specialist Construction Trades
```

6. No abrir implementación.

7. Ejecutar:

- `git diff --check`;
- validaciones documentales existentes;
- `npm run check:migrations` si existe.

8. Resumen final:

- rama;
- archivos creados/modificados;
- documento padre enlazado;
- validaciones;
- confirmación de que no se tocó código, migraciones, Stripe, Supabase, Vercel ni producción.

---

# 26. Fuentes oficiales de referencia

Fuentes consultadas y que deberán revisarse de nuevo antes de implementar:

1. Agencia Tributaria — tipos de IVA en obras en viviendas:
   https://sede.agenciatributaria.gob.es/Sede/iva/iva-operaciones-inmobiliarias/que-tipo-se-aplica-obras-viviendas.html

2. Agencia Tributaria — preguntas frecuentes sobre obras y reparaciones:
   https://sede.agenciatributaria.gob.es/Sede/iva/iva-operaciones-inmobiliarias/preguntas-frecuentes-sobre-obras-reparaciones-inmuebles.html

3. Agencia Tributaria — inversión del sujeto pasivo:
   https://sede.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/que-casos-no-tengo-que-iva/inversion-sujeto-pasivo.html

4. Agencia Tributaria — devengo y cobros anticipados:
   https://sede.agenciatributaria.gob.es/Sede/iva/calculo-iva-repercutido-clientes/que-momento-tengo-que-repercutir-iva.html

5. Agencia Tributaria — obligación de facturar:
   https://sede.agenciatributaria.gob.es/Sede/iva/facturacion-registro/facturacion-iva/obligacion-facturar.html

6. Agencia Tributaria — facturas simplificadas:
   https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/folleto-actividades-economicas/5-impuesto-sobre-valor-anadido/5_10-facturas/5_10_6-facturas-simplificadas.html

7. BOE — Reglamento de obligaciones de facturación, Real Decreto 1619/2012:
   https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696

8. Agencia Tributaria — limitación de pagos en efectivo:
   https://sede.agenciatributaria.gob.es/Sede/normativa-criterios-interpretativos/analisis/Pagos_en_efectivo.html

9. BOE — Ley 32/2006 de subcontratación en construcción:
   https://www.boe.es/buscar/act.php?id=BOE-A-2006-18205

10. Ministerio de Trabajo — preguntas del Registro de Empresas Acreditadas:
    https://expinterweb.mites.gob.es/rea/pub/preguntasdetalle.htm

11. BOE — Reglamento Electrotécnico para Baja Tensión:
    https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099

12. BOE — Reglamento técnico de distribución y utilización de combustibles gaseosos:
    https://www.boe.es/buscar/act.php?id=BOE-A-2006-15345

13. BOE — Reglamento de Instalaciones Térmicas en los Edificios:
    https://www.boe.es/buscar/act.php?id=BOE-A-2007-15820

14. BOE — texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios:
    https://www.boe.es/buscar/doc.php?id=BOE-A-2007-20555

15. Comunidad de Madrid — reformas del hogar, ejemplo de regulación territorial:
    https://www.comunidad.madrid/consumo/reformas-hogar

---

# 27. Conclusión estratégica

La primera vertical no debe definirse como “construcción” en sentido amplio.

Debe definirse como:

> **Gestión de trabajos, presupuestos, documentación y facturación para profesionales especialistas de instalación, reparación y obra por encargo.**

La base común permanece estable. El programa “cambia” mediante:

- perfil de oficio;
- contexto legal;
- método de precio;
- requisitos documentales;
- campos y flujos condicionales.

Principio final:

> **No crear cinco programas distintos ni un formulario gigante. Crear un núcleo común capaz de hablar el idioma de cada gremio y de adaptar la documentación al contexto real de cada trabajo.**
