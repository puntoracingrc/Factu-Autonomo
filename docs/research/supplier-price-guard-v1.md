# SUPPLIER_PRICE_GUARD_V1

> Documento de investigacion futura. No implica implementacion inmediata ni compromiso comercial. Cualquier desarrollo derivado debera validarse con datos reales anonimizados, revision tecnica, revision legal/fiscal cuando aplique y respeto a la integridad documental de Factura Autonomo.

## Sistema de vigilancia de precios, descuentos y anomalías en facturas de proveedores

**Estado:** `FUTURE / RESEARCH / NOT IMPLEMENTED`
**Fecha de referencia:** 2026-06-25
**Producto:** Facturación Autónomos
**Ubicación sugerida en el repositorio:** `docs/research/supplier-price-guard-v1.md`
**Módulos relacionados:** escáner de gastos, base inteligente de precios, presupuestos, memoria de trabajos y control de margen.

---

## 1. Resumen ejecutivo

`SUPPLIER_PRICE_GUARD_V1` es un módulo futuro destinado a analizar las líneas extraídas de facturas de proveedores y detectar:

- subidas o bajadas anómalas de precio;
- descuentos habituales que han cambiado o desaparecido;
- cambios de tarifa;
- referencias o formatos posiblemente distintos;
- errores de lectura del OCR;
- cambios de unidad o cantidad por envase;
- recargos o portes incluidos de forma inesperada;
- duplicidades o inconsistencias;
- impactos potenciales sobre presupuestos y márgenes.

El sistema no debe considerar automáticamente cualquier precio leído como el nuevo precio válido de un material. Cada línea escaneada constituye una **observación de compra**. Las observaciones normales y de alta confianza pueden alimentar la base histórica; las observaciones dudosas o anómalas deben quedar en revisión.

Principio central:

> Una factura real puede registrarse como gasto aunque alguna de sus líneas parezca extraña. Lo que se bloquea es la actualización automática de la referencia de precios, no el registro contable de la factura.

Este módulo debe funcionar aunque una factura contenga materiales destinados a varios trabajos, compras para almacén o artículos cuyo destino todavía no se conozca. No será obligatorio repartir el gasto entre trabajos para detectar variaciones de precio.

---

## 2. Problema que resuelve

Muchos autónomos reciben tarifas variables y descuentos comerciales personalizados. Un proveedor puede:

- subir la tarifa;
- reducir el descuento;
- omitir un descuento por error;
- facturar otra referencia parecida;
- cambiar el formato o las unidades por caja;
- aplicar portes o recargos;
- modificar condiciones por volumen;
- emitir una factura con un error;
- mantener la tarifa y cambiar únicamente el descuento;
- cambiar tarifa y descuento a la vez.

Sin un sistema de comparación, estas variaciones pueden pasar desapercibidas y reducir el margen de presupuestos posteriores.

### Ejemplo

Histórico habitual:

- tarifa: 100,00 €;
- descuento: 30 %;
- coste neto: 70,00 €.

Nueva factura:

- tarifa: 105,00 €;
- descuento: 20 %;
- coste neto: 84,00 €.

El coste neto aumenta un 20 %, aunque la tarifa solo haya subido un 5 %. La causa principal es el cambio de descuento.

El sistema debería mostrar:

> **Cambio importante detectado**
> El coste neto ha aumentado un 20 %. La tarifa ha subido un 5 % y el descuento ha cambiado del 30 % al 20 %. Este precio no actualizará la referencia habitual hasta que lo revises.

---

## 3. Objetivos

### 3.1 Objetivos de producto

- Proteger el margen del autónomo.
- Detectar posibles errores de proveedor u OCR.
- Mantener una base de precios reciente sin mantenimiento manual continuo.
- Diferenciar tarifa, descuento y precio neto comparable.
- Evitar que una lectura anómala contamine presupuestos futuros.
- Informar del impacto de una subida sobre presupuestos abiertos.
- Mantener trazabilidad completa desde la factura original hasta la decisión del usuario.
- Reducir trabajo administrativo sin quitar control al profesional.

### 3.2 Objetivos de negocio

- Crear una función Pro con valor económico directo.
- Diferenciar el escáner de gastos de un OCR meramente documental.
- Aumentar la retención mediante alertas útiles y explicables.
- Conectar compras, presupuestos y margen sin exigir contabilidad analítica exhaustiva.
- Posicionar el producto como sistema de protección de margen, no solo como programa de facturación.

### 3.3 No objetivos

Este módulo no debe:

- decidir automáticamente qué factura está mal;
- reclamar al proveedor de forma automática;
- cambiar precios de venta sin permiso;
- cambiar presupuestos aceptados;
- modificar facturas emitidas;
- exigir asignar cada compra a un trabajo;
- sustituir la contabilidad;
- gestionar inventario completo;
- valorar existencias contablemente;
- mezclar datos entre empresas;
- garantizar que una anomalía sea un error real;
- usar IA para efectuar cálculos económicos opacos.

---

## 4. Principios de diseño

### 4.1 Observación no equivale a precio aprobado

Cada línea de compra genera una observación. Solo las observaciones aprobadas o aceptadas según reglas configuradas pueden actualizar la base de referencia.

### 4.2 La factura se registra aunque exista una alerta

El gasto y el documento del proveedor deben poder registrarse. La alerta afecta únicamente al uso del precio como referencia futura.

### 4.3 Cálculo determinista, explicación asistida

Los importes, porcentajes, diferencias y umbrales deben calcularse con lógica determinista. La IA puede ayudar a leer, relacionar y explicar, pero no debe inventar cifras ni ocultar la fórmula.

### 4.4 Confirmación humana en cambios relevantes

Los cambios críticos requieren aprobación manual. El usuario conserva siempre la decisión final.

### 4.5 No se necesita asignación por trabajo

El control de precios opera por proveedor, referencia, unidad y fecha. La compra puede ser para:

- varios trabajos;
- stock;
- consumo general;
- un trabajo todavía no creado;
- destino desconocido.

La asignación a trabajos será opcional y pertenecerá a otro módulo.

### 4.6 Histórico inmutable

Las observaciones pasadas no se sobrescriben. Las nuevas observaciones se añaden al histórico. Las correcciones deben quedar auditadas.

### 4.7 Aislamiento por empresa

Los precios, descuentos y condiciones comerciales son privados de cada empresa. No se mezclan con otras cuentas.

---

## 5. Alcance funcional futuro

### 5.1 Incluido en V1

- Recepción de líneas desde el escáner de gastos.
- Normalización de cantidades, unidades e importes.
- Identificación de proveedor y referencia.
- Comparación con histórico aprobado.
- Detección de anomalías por reglas.
- Clasificación de severidad.
- Cuarentena de precios críticos.
- Pantalla de revisión.
- Actualización controlada de la base de precios.
- Historial de decisiones.
- Alertas sobre presupuestos no aceptados.
- Avisos internos sobre presupuestos aceptados.
- Configuración básica de umbrales.
- Registro de auditoría.

### 5.2 Fuera de alcance inicial

- Inventario y stock en tiempo real.
- Coste medio ponderado contable.
- FIFO/LIFO.
- Pedidos automáticos.
- Negociación automática con proveedores.
- Envío automático de reclamaciones.
- Importación directa de tarifas comerciales complejas.
- Predicción de precios de mercado.
- Comparación entre proveedores no relacionados.
- Benchmark anónimo entre empresas.
- Automatización de pagos.
- Contabilidad analítica completa.

---

## 6. Relación con otros módulos

### 6.1 Escáner de gastos

Responsable de:

- almacenar el documento;
- extraer cabecera y líneas;
- detectar importes, cantidades, referencias y descuentos;
- aportar nivel de confianza por campo;
- permitir corrección manual.

No decide si un precio es normal.

### 6.2 Supplier Price Guard

Responsable de:

- normalizar;
- comparar;
- detectar anomalías;
- generar alertas;
- gestionar revisión;
- decidir si una observación puede alimentar la base de precios.

### 6.3 Base inteligente de precios

Responsable de:

- conservar observaciones aprobadas;
- calcular último precio aprobado;
- calcular estadísticas recientes;
- mantener descuento habitual;
- proporcionar costes de referencia al presupuestador.

### 6.4 Presupuestos

Usan precios aprobados o snapshots históricos. Nunca toman como referencia principal una observación crítica pendiente.

### 6.5 Memoria de trabajos

Usa snapshots de costes empleados en cada presupuesto y datos reales de cierre. No debe depender de que las facturas se asignen perfectamente a trabajos.

---

## 7. Terminología

### `supplier`

Proveedor.

### `supplier_item`

Artículo normalizado dentro de la empresa usuaria.

### `supplier_item_alias`

Nombre, descripción o referencia concreta que utiliza un proveedor para identificar un artículo.

### `price_observation`

Precio observado en una línea de factura.

### `approved_baseline`

Referencia de precio aprobada utilizada para comparar y presupuestar.

### `anomaly`

Diferencia significativa o inconsistencia detectada.

### `quarantine`

Estado en el que una observación queda excluida de la referencia habitual hasta revisión.

### `comparable_net_unit_cost`

Coste neto unitario normalizado y comparable, normalmente sin IVA.

### `review_decision`

Decisión explícita del usuario sobre una observación o alerta.

---

## 8. Actores y permisos

### Propietario/administrador

- Configura reglas.
- Revisa alertas.
- Aprueba nuevas tarifas.
- Modifica relaciones entre referencias.
- Consulta impacto sobre presupuestos.
- Gestiona permisos.

### Usuario de compras/administración

- Escanea facturas.
- Corrige OCR.
- Revisa alertas si dispone de permiso.
- Marca posibles errores del proveedor.

### Usuario de presupuestos

- Ve costes aprobados.
- Recibe avisos de impacto.
- No modifica observaciones de proveedor salvo permiso.

### Sistema

- Calcula diferencias.
- Genera alertas.
- Mantiene trazabilidad.
- Nunca aprueba cambios críticos por sí solo.

---

## 9. Arquitectura lógica

```text
Factura de proveedor
        |
        v
Escáner / OCR
        |
        v
Extracción de líneas y confianza
        |
        v
Normalizador de unidades e importes
        |
        v
Resolución de proveedor, referencia y alias
        |
        v
Cálculo del coste neto comparable
        |
        v
Motor de anomalías
        |
        +--------------------------+
        |                          |
        v                          v
Observación normal          Observación anómala
        |                          |
        v                          v
Histórico aprobado         Cuarentena / revisión
        |                          |
        +-------------+------------+
                      |
                      v
             Base inteligente de precios
                      |
                      v
       Presupuestos, alertas de margen y análisis
```

### Componentes

1. **Document ingestion**
2. **OCR/extraction**
3. **Line normalization**
4. **Item matching**
5. **Comparable price calculator**
6. **Baseline service**
7. **Anomaly rules engine**
8. **Review workflow**
9. **Price history store**
10. **Quote impact analyzer**
11. **Notification service**
12. **Audit log**

---

## 10. Flujo principal

### Paso 1. Recepción

El usuario:

- sube un PDF;
- fotografía una factura;
- reenvía un documento;
- importa una factura electrónica cuando exista integración.

### Paso 2. Extracción

Se extraen:

- proveedor;
- número y fecha de factura;
- referencia del artículo;
- descripción;
- cantidad;
- unidad;
- precio de tarifa;
- descuentos;
- importe neto;
- IVA;
- portes;
- recargos;
- total de línea;
- confianza del OCR por campo.

### Paso 3. Normalización

El sistema intenta determinar:

- unidad comparable;
- cantidad real;
- número de unidades por envase;
- moneda;
- precio neto sin IVA;
- descuentos de línea;
- descuentos globales atribuibles;
- recargos atribuibles;
- referencia equivalente.

### Paso 4. Resolución del artículo

Posibles resultados:

- coincidencia exacta por proveedor y referencia;
- coincidencia por alias confirmado;
- sugerencia por similitud;
- artículo nuevo;
- referencia ambigua;
- posible cambio de formato.

Las coincidencias no exactas requieren un nivel de confianza y, según el riesgo, confirmación.

### Paso 5. Cálculo comparable

Se calcula el coste neto unitario normalizado.

### Paso 6. Comparación

Se compara con:

- último precio aprobado;
- mediana reciente;
- rango histórico;
- descuento habitual;
- tarifa habitual;
- observaciones del mismo proveedor;
- condiciones de volumen similares;
- unidad y formato anteriores.

### Paso 7. Clasificación

Resultado:

- normal;
- informativo;
- advertencia;
- crítico;
- no comparable;
- requiere corrección de OCR.

### Paso 8. Persistencia

La observación se guarda siempre. Su estado determina si puede influir en la referencia de precios.

### Paso 9. Revisión

El usuario recibe una explicación y decide.

### Paso 10. Impacto

Si se confirma un cambio importante, se revisan presupuestos y plantillas relevantes sin modificar documentos automáticamente.

---

## 11. Facturas mixtas, stock y destino desconocido

Este sistema no debe obligar a distribuir las compras entre trabajos.

Una factura puede contener:

- materiales para tres instalaciones;
- herramientas;
- consumibles;
- compras para almacén;
- artículos de uso general;
- materiales todavía sin destino;
- portes comunes.

Cada línea puede alimentar la inteligencia de precios con independencia de su asignación.

### Regla

> Para vigilar precios se necesita saber qué se compró, a quién, cuánto, en qué unidad y a qué coste. No se necesita saber todavía en qué trabajo se utilizará.

### Asignación opcional

En el futuro, otro flujo puede permitir:

- asignar una cantidad a un trabajo;
- dejar una cantidad en stock;
- dividir una línea;
- marcar consumo general;
- mantener destino desconocido.

La falta de asignación no debe bloquear la detección de precios.

---

## 12. Cálculo del precio neto comparable

### 12.1 Fórmula conceptual

```text
importe_base_linea
- descuentos_de_linea
- descuentos_globales_asignados
+ recargos_atribuibles
= coste_neto_comparable_de_linea

coste_neto_comparable_de_linea
/ cantidad_normalizada
= coste_neto_unitario_comparable
```

El IVA se excluye por defecto de la comparación de coste.

### 12.2 Portes

Configuración recomendada:

- por defecto, los portes se comparan como concepto separado;
- opcionalmente pueden distribuirse entre líneas para análisis de coste total;
- nunca deben mezclarse silenciosamente con el precio base del material;
- el usuario debe poder alternar entre:
  - coste de compra puro;
  - coste puesto en almacén/obra.

### 12.3 Descuentos globales

Si existe un descuento global:

- distribuir proporcionalmente cuando la factura lo permita;
- marcar la distribución como calculada;
- conservar el descuento original;
- permitir corrección manual.

### 12.4 Unidades

Ejemplos de unidades comparables:

- unidad;
- metro;
- metro cuadrado;
- kilogramo;
- litro;
- caja;
- paquete;
- rollo.

No se compararán directamente:

- una caja con una unidad;
- un rollo de 25 m con otro de 50 m;
- una referencia de 20 Nm con otra de 30 Nm;
- un envase de 5 l con uno de 15 l;

salvo que exista conversión confirmada.

### 12.5 Redondeo

- Cálculos internos con precisión suficiente.
- Redondeo solo en presentación o conforme a reglas contables.
- Conservar importes originales de factura.

---

## 13. Construcción de la referencia histórica

### 13.1 Arranque sin histórico

Cuando no existen compras anteriores:

- guardar observación como `provisional`;
- no generar alerta de variación;
- mostrar “sin histórico suficiente”;
- permitir aprobación como primera referencia.

### 13.2 Confianza progresiva

Ejemplo orientativo:

- 1 observación: confianza baja;
- 2 observaciones: confianza baja/media;
- 3 a 4 observaciones comparables: referencia inicial;
- 5 o más: referencia robusta;
- histórico reciente y consistente: confianza alta.

### 13.3 Valores recomendados de referencia

Mantener:

- último precio aprobado;
- mediana de las últimas N compras;
- media recortada opcional;
- mínimo y máximo reciente;
- descuento más frecuente;
- tarifa más reciente;
- fecha de última compra;
- número de observaciones válidas;
- nivel de confianza.

La mediana debe preferirse a una media simple cuando existan valores extremos.

### 13.4 Ventana temporal

Configurable por artículo o proveedor:

- últimas 5 compras;
- últimas 10 compras;
- últimos 90 días;
- últimos 180 días;
- último año.

Los materiales muy volátiles pueden utilizar ventanas más cortas.

---

## 14. Motor de detección de anomalías

### 14.1 Reglas principales

#### `NET_PRICE_INCREASE`

Aumento del coste neto unitario.

#### `NET_PRICE_DECREASE`

Bajada brusca que puede indicar error, bonificación, unidad incorrecta o cambio de referencia.

#### `DISCOUNT_REDUCED`

El descuento es inferior al habitual.

#### `DISCOUNT_MISSING`

El descuento habitual no aparece.

#### `DISCOUNT_INCREASED`

Descuento superior al normal; puede ser correcto o indicar lectura errónea.

#### `LIST_PRICE_CHANGED`

Cambio de tarifa manteniendo descuento similar.

#### `LIST_AND_DISCOUNT_CHANGED`

Cambio simultáneo de tarifa y descuento.

#### `UNIT_CHANGED`

Unidad diferente a la habitual.

#### `PACK_SIZE_CHANGED`

Cambio de contenido por caja, paquete o rollo.

#### `REFERENCE_MISMATCH`

Referencia distinta o similar pero no idéntica.

#### `OCR_LOW_CONFIDENCE`

Campos críticos con baja confianza.

#### `DUPLICATE_LINE`

Posible duplicidad.

#### `SURCHARGE_DETECTED`

Recargo nuevo o inesperado.

#### `FREIGHT_ANOMALY`

Portes anormalmente altos o incluidos dentro de una línea.

#### `GLOBAL_DISCOUNT_ALLOCATION_UNCERTAIN`

No se puede distribuir con seguridad un descuento global.

#### `CURRENCY_CHANGED`

Cambio de moneda.

#### `CREDIT_NOTE_OR_RETURN`

La línea puede corresponder a devolución o abono y no debe tratarse como compra normal.

### 14.2 Comparación robusta

La detección puede combinar:

- diferencia respecto al último precio aprobado;
- diferencia respecto a la mediana reciente;
- desviación respecto al rango histórico;
- diferencia de descuento;
- número de observaciones;
- confianza del OCR;
- similitud de unidad y formato;
- antigüedad del histórico;
- volatilidad habitual del artículo.

### 14.3 Umbrales orientativos

Valores iniciales configurables:

- informativo: variación de 3 % a 7 %;
- advertencia: variación de 7 % a 15 %;
- crítico: variación superior a 15 %;
- crítico por descuento: desaparición completa de un descuento habitual relevante;
- crítico por OCR: baja confianza en cantidad, precio o descuento;
- crítico por unidad: cambio no confirmado.

Estos valores no deben codificarse como universales. Cada empresa, proveedor o artículo puede requerir ajustes.

### 14.4 Artículos volátiles

Permitir clasificar artículos como:

- estable;
- variación moderada;
- volátil;
- estacional;
- sin clasificación.

Un artículo volátil puede tener umbrales mayores, pero nunca debe ignorar cambios de unidad o descuento.

---

## 15. Niveles de severidad

### `INFO`

Ejemplo:

> El coste neto ha aumentado un 3,4 % respecto a la última compra.

Acción:

- puede actualizar histórico automáticamente si OCR y coincidencia son de alta confianza;
- queda registrado.

### `WARNING`

Ejemplo:

> El coste neto ha aumentado un 11,2 % respecto a la mediana de las últimas cinco compras.

Acción:

- revisión recomendada;
- puede entrar al histórico como observación, pero no sustituye inmediatamente la referencia principal según configuración.

### `CRITICAL`

Ejemplo:

> El descuento habitual del 30 % aparece ahora como 0 % y el coste neto ha aumentado un 42 %.

Acción:

- observación en cuarentena;
- no actualiza la referencia;
- requiere decisión manual.

### `BLOCKED_BY_DATA_QUALITY`

Ejemplo:

> No se puede determinar si la cantidad es 1, 7 o 17 unidades.

Acción:

- corregir OCR antes de comparar.

---

## 16. Estados

### 16.1 Estado de observación

- `extracted`
- `normalizing`
- `unmatched`
- `matched_low_confidence`
- `comparable`
- `pending_review`
- `approved_normal`
- `approved_new_tariff`
- `approved_temporary_exception`
- `approved_supplier_error_pending_credit`
- `rejected_ocr_error`
- `rejected_wrong_item`
- `ignored_for_baseline`
- `superseded`
- `cancelled`

### 16.2 Estado de alerta

- `open`
- `acknowledged`
- `in_review`
- `waiting_supplier`
- `resolved_accepted`
- `resolved_rejected`
- `resolved_ocr_corrected`
- `dismissed`
- `reopened`

### 16.3 Estado de referencia

- `provisional`
- `active`
- `stale`
- `under_review`
- `superseded`
- `inactive`

---

## 17. Flujo de revisión humana

La pantalla debe mostrar:

- proveedor;
- factura;
- fecha;
- línea original;
- referencia;
- descripción;
- unidad y cantidad;
- precio de tarifa;
- descuento;
- precio neto;
- histórico reciente;
- diferencia absoluta;
- diferencia porcentual;
- causa detectada;
- confianza del OCR;
- posible impacto en presupuestos.

### Acciones

- `Aceptar como nueva tarifa`
- `Aceptar como precio normal`
- `Aceptar como excepción temporal`
- `El descuento parece incorrecto`
- `Posible error del proveedor`
- `El OCR ha leído mal`
- `Es otro artículo`
- `Ha cambiado el formato o envase`
- `Es una compra por volumen distinta`
- `Ignorar para la base de precios`
- `Mantener en revisión`
- `Preparar consulta al proveedor`

### Confirmaciones

Al aceptar una nueva tarifa:

- registrar quién la aprobó;
- guardar fecha;
- conservar referencia anterior;
- recalcular baseline;
- analizar presupuestos abiertos.

Al marcar error del proveedor:

- registrar tarea pendiente;
- permitir adjuntar nota;
- no actualizar baseline;
- aceptar que el gasto documental siga registrado;
- relacionar posteriormente un abono o factura corregida.

---

## 18. Mensajes explicables

Ejemplo completo:

> **Revisa esta línea antes de actualizar precios**
>
> **Artículo:** Motor tubular 20 Nm
> **Proveedor:** Proveedor X
> **Últimas 6 compras:** 54,80 €–57,20 € netos por unidad
> **Nueva factura:** 71,40 € netos por unidad
> **Diferencia frente a la mediana:** +25,7 %
>
> Además, el descuento habitual del 30 % aparece ahora como 15 %.
>
> Posibles causas:
> - nueva tarifa;
> - descuento incorrecto;
> - referencia o potencia diferente;
> - cambio de envase;
> - error de lectura.

El sistema debe diferenciar claramente:

- hecho calculado;
- hipótesis;
- acción recomendada.

---

## 19. Impacto sobre presupuestos

### 19.1 Presupuesto en borrador

El sistema puede:

- mostrar alerta;
- recalcular coste interno;
- proponer precio recomendado;
- mostrar margen anterior y nuevo;
- permitir aplicar o ignorar.

Nunca cambiar automáticamente el precio de venta sin confirmación.

### 19.2 Presupuesto enviado pero no aceptado

Mostrar:

> Este presupuesto utiliza un coste anterior. El nuevo coste validado reduciría el margen del 28 % al 18 %.

Opciones:

- revisar presupuesto;
- mantener condiciones;
- crear nueva versión;
- ignorar para este documento.

### 19.3 Presupuesto aceptado

No modificar.

Mostrar aviso interno:

> El material ha subido después de la aceptación. El margen previsto podría reducirse.

El sistema puede ayudar a aprender para futuros trabajos, pero no debe alterar lo pactado.

### 19.4 Factura emitida

Nunca modificar.

### 19.5 Plantillas

No actualizar automáticamente precios guardados en plantillas. Proponer:

- actualizar coste de referencia;
- conservar tarifa de venta;
- revisar margen;
- crear una nueva versión de plantilla.

---

## 20. Modelo conceptual de datos

No crear migraciones en la fase documental.

### `supplier_items`

- `id`
- `tenant_id`
- `canonical_name`
- `category`
- `base_unit`
- `volatility_class`
- `active`
- `created_at`
- `updated_at`

### `supplier_item_aliases`

- `id`
- `tenant_id`
- `supplier_id`
- `supplier_item_id`
- `supplier_reference`
- `supplier_description`
- `unit`
- `pack_size`
- `conversion_factor`
- `match_confidence`
- `confirmed_by_user_id`
- `confirmed_at`
- `active`

### `supplier_price_observations`

- `id`
- `tenant_id`
- `supplier_id`
- `supplier_item_id`
- `supplier_item_alias_id`
- `expense_invoice_id`
- `expense_invoice_line_id`
- `invoice_date`
- `currency`
- `raw_quantity`
- `raw_unit`
- `normalized_quantity`
- `normalized_unit`
- `pack_size`
- `list_unit_price`
- `line_discount_percent`
- `line_discount_amount`
- `allocated_global_discount`
- `attributable_surcharges`
- `freight_allocation`
- `net_line_amount`
- `comparable_net_unit_cost`
- `tax_excluded`
- `ocr_confidence`
- `matching_confidence`
- `status`
- `created_at`
- `reviewed_at`
- `reviewed_by_user_id`

### `supplier_price_baselines`

- `id`
- `tenant_id`
- `supplier_id`
- `supplier_item_id`
- `reference_type`
- `last_approved_price`
- `rolling_median_price`
- `trimmed_mean_price`
- `normal_min_price`
- `normal_max_price`
- `usual_discount_percent`
- `last_list_price`
- `observation_count`
- `confidence_level`
- `window_start`
- `window_end`
- `effective_from`
- `status`
- `updated_at`

### `supplier_price_alerts`

- `id`
- `tenant_id`
- `observation_id`
- `baseline_id`
- `alert_type`
- `severity`
- `previous_value`
- `new_value`
- `absolute_difference`
- `percentage_difference`
- `discount_difference_points`
- `explanation_code`
- `explanation_text`
- `status`
- `created_at`
- `resolved_at`
- `resolved_by_user_id`

### `supplier_price_review_decisions`

- `id`
- `tenant_id`
- `alert_id`
- `observation_id`
- `decision_type`
- `reason`
- `notes`
- `previous_baseline_snapshot`
- `new_baseline_snapshot`
- `actor_user_id`
- `created_at`

### `supplier_price_policies`

- `id`
- `tenant_id`
- `supplier_id` nullable
- `supplier_item_id` nullable
- `info_threshold_percent`
- `warning_threshold_percent`
- `critical_threshold_percent`
- `discount_drop_threshold_points`
- `minimum_observations`
- `comparison_window_days`
- `auto_approve_enabled`
- `active`

### `supplier_price_quote_impacts`

- `id`
- `tenant_id`
- `alert_id`
- `quote_id`
- `quote_version_id`
- `affected_line_id`
- `old_cost_snapshot`
- `new_cost_snapshot`
- `old_margin`
- `new_margin`
- `status`
- `user_decision`
- `created_at`
- `resolved_at`

### `supplier_price_audit_events`

- `id`
- `tenant_id`
- `actor_user_id`
- `entity_type`
- `entity_id`
- `action`
- `before`
- `after`
- `reason`
- `created_at`

---

## 21. Eventos de dominio

Eventos conceptuales:

- `expense_invoice.scanned`
- `expense_invoice.line_extracted`
- `supplier_item.alias_matched`
- `supplier_item.alias_needs_review`
- `supplier_price.observation_created`
- `supplier_price.observation_normalized`
- `supplier_price.alert_created`
- `supplier_price.observation_quarantined`
- `supplier_price.observation_approved`
- `supplier_price.baseline_updated`
- `supplier_price.supplier_error_reported`
- `supplier_price.quote_impact_detected`
- `supplier_price.quote_impact_resolved`

Los consumidores deben ser idempotentes.

---

## 22. APIs conceptuales futuras

No implementar en esta fase.

### Consultar alertas

`GET /api/supplier-price-alerts`

Filtros:

- estado;
- severidad;
- proveedor;
- artículo;
- fecha.

### Revisar alerta

`POST /api/supplier-price-alerts/{id}/review`

Payload conceptual:

```json
{
  "decision": "APPROVE_NEW_TARIFF",
  "reason": "Proveedor confirma nueva tarifa desde junio",
  "notes": "Aplicar a presupuestos en borrador"
}
```

### Consultar histórico

`GET /api/supplier-items/{id}/price-history`

### Consultar impacto

`GET /api/supplier-price-alerts/{id}/quote-impacts`

### Corregir relación de artículo

`POST /api/supplier-price-observations/{id}/match`

Todas las operaciones deben verificar tenant, rol, versión y estado.

---

## 23. Papel de la IA

### Permitido

- extraer campos del documento;
- sugerir relación entre descripciones;
- detectar posible equivalencia de referencias;
- convertir unidades si existe evidencia;
- resumir la anomalía;
- proponer preguntas de revisión;
- generar un borrador de mensaje al proveedor;
- clasificar una nota del usuario.

### No permitido

- aprobar automáticamente una anomalía crítica;
- inventar descuentos;
- inferir una unidad sin marcar incertidumbre;
- cambiar la base de precios sin regla o confirmación;
- modificar presupuestos aceptados;
- afirmar que el proveedor se ha equivocado;
- utilizar datos de otras empresas sin autorización.

### Requisito

Cada campo extraído debe conservar:

- valor;
- fuente;
- nivel de confianza;
- corrección manual, si existe.

---

## 24. Configuración

### Configuración global

- umbrales de variación;
- número mínimo de compras;
- ventana temporal;
- inclusión o exclusión de portes;
- autoaprobación de cambios pequeños;
- notificaciones;
- roles autorizados.

### Configuración por proveedor

- descuento habitual esperado;
- moneda;
- tolerancia;
- plazos de cambio de tarifa;
- referencias conocidas;
- condiciones por volumen.

### Configuración por artículo

- volatilidad;
- unidad base;
- equivalencias;
- umbral propio;
- si requiere revisión siempre;
- si no debe alimentar presupuestos automáticamente.

---

## 25. Notificaciones

### Notificaciones inmediatas

Solo para:

- alertas críticas;
- desaparición total de descuento;
- cambio de unidad;
- posible error de OCR con alto impacto;
- impacto importante sobre presupuestos.

### Resumen periódico

- cambios aprobados;
- alertas pendientes;
- artículos con mayor subida;
- descuentos perdidos;
- presupuestos afectados;
- posibles consultas al proveedor.

Canales futuros:

- notificación interna;
- email;
- resumen semanal;
- panel Pro.

Evitar saturar al usuario con variaciones irrelevantes.

---

## 26. Panel y métricas

### Panel recomendado

- alertas críticas abiertas;
- alertas pendientes;
- subidas aprobadas del mes;
- descuentos reducidos;
- ahorro potencial detectado;
- presupuestos con margen afectado;
- artículos sin histórico suficiente;
- proveedores con más incidencias.

### Métricas de producto

- facturas escaneadas;
- líneas normalizadas;
- porcentaje de coincidencia automática;
- alertas por severidad;
- falsos positivos;
- tiempo medio de revisión;
- observaciones aprobadas;
- errores de OCR corregidos;
- presupuestos revisados;
- pérdidas de margen potencialmente evitadas.

El “ahorro potencial” debe presentarse como estimación, no como ahorro garantizado.

---

## 27. Casos especiales

### Abonos y devoluciones

No deben alimentar la referencia como compra normal. Deben relacionarse con la compra original cuando sea posible.

### Bonificaciones y unidades gratuitas

Calcular coste efectivo, pero conservar:

- unidades facturadas;
- unidades entregadas;
- bonificación;
- coste efectivo.

### Descuento por volumen

Comparar con compras de volumen similar. No alertar igual por una unidad que por cien.

### Cambio de referencia del fabricante

Permitir relación entre referencia antigua y nueva con confirmación.

### Sustitución de formato

Ejemplo: caja de 20 pasa a caja de 16. Comparar por unidad, pero alertar del cambio de contenido.

### Moneda extranjera

Conservar tipo de cambio y fecha. Separar variación del material de variación de divisa.

### Recargos ambientales o energéticos

Registrar como conceptos separados o recargos atribuibles. No ocultarlos dentro del precio de material.

### Tarifas netas sin descuento visible

Algunos proveedores no muestran tarifa y descuento, solo neto. En ese caso se vigila el neto, pero no se inventa un descuento.

### Factura manuscrita o ilegible

Requerir revisión manual antes de usar el precio.

---

## 28. Seguridad y privacidad

- Aislamiento estricto por `tenant_id`.
- RLS o mecanismo equivalente.
- Cifrado en tránsito y reposo.
- Acceso por roles.
- Auditoría de aprobaciones y correcciones.
- No exponer facturas de proveedor a otros clientes.
- No utilizar precios comerciales para entrenamientos externos sin consentimiento explícito.
- Enmascarar datos sensibles en logs.
- Limitar URLs firmadas de documentos.
- Registrar cambios manuales importantes.
- Evitar que una alerta revele datos de otra empresa.

---

## 29. Requisitos no funcionales

### Rendimiento

- Procesamiento asíncrono tras el escaneo.
- La factura debe poder guardarse aunque el análisis tarde.
- Reintentos idempotentes.
- Cálculo incremental de baselines.

### Disponibilidad

- Una caída del motor de anomalías no debe impedir registrar el gasto.
- Las observaciones pendientes deben poder reprocesarse.

### Trazabilidad

Cada alerta debe poder responder:

- de qué factura salió;
- qué línea se leyó;
- qué valores se compararon;
- qué histórico se usó;
- qué regla se activó;
- quién tomó la decisión;
- qué presupuestos quedaron afectados.

### Explicabilidad

No mostrar una alerta sin valores comparables y motivo.

---

## 30. Estrategia de pruebas

### Pruebas unitarias

- cálculo neto;
- descuentos múltiples;
- descuentos globales;
- unidades;
- conversiones;
- umbrales;
- clasificación de severidad;
- mediana;
- histórico insuficiente;
- quarantena;
- redondeo.

### Pruebas de integración

- OCR → observación;
- observación → alerta;
- aprobación → baseline;
- baseline → impacto en presupuesto;
- corrección OCR → recálculo;
- abono → exclusión.

### Casos de regresión

- descuento 30 % a 20 %;
- descuento 30 % a 0 %;
- tarifa +5 % y descuento reducido;
- cambio caja 20 a caja 16;
- precio anormalmente bajo;
- factura duplicada;
- unidad metro frente a rollo;
- compra por volumen;
- portes altos;
- moneda distinta;
- artículo nuevo;
- proveedor nuevo.

### Pruebas de seguridad

- aislamiento tenant;
- permisos;
- manipulación de IDs;
- auditoría;
- documentos firmados;
- eventos duplicados.

### Validación con usuarios

- autónomos de instalaciones;
- carpintería;
- pintura;
- reparaciones;
- fotografía;
- profesionales que compran materiales de forma recurrente.

---

## 31. Roadmap sugerido

### Fase SPG-0 — Investigación

- entrevistar usuarios;
- recopilar facturas anonimizadas;
- estudiar descuentos y unidades;
- definir taxonomía;
- validar mensajes.

### Fase SPG-1 — Histórico manual

- extracción;
- revisión de líneas;
- alias;
- histórico de precios;
- sin alertas automáticas complejas.

### Fase SPG-2 — Reglas deterministas

- variaciones;
- descuento perdido;
- unidad;
- cuarentena;
- aprobación manual.

### Fase SPG-3 — Impacto en presupuestos

- detectar líneas afectadas;
- recalcular coste interno;
- avisar de margen;
- no modificar automáticamente.

### Fase SPG-4 — Asistencia IA

- mejor matching;
- explicación;
- borrador de consulta;
- clasificación de incidencias.

### Fase SPG-5 — Inteligencia avanzada

- volatilidad adaptativa;
- condiciones por volumen;
- patrones por proveedor;
- integración opcional con tarifas oficiales.

---

## 32. Dependencias previas

Antes de implementar:

1. Escáner de gastos estable.
2. Modelo de proveedores.
3. Líneas estructuradas de facturas de compra.
4. Sistema de unidades.
5. Base de materiales/artículos opcional.
6. Sistema de permisos.
7. Auditoría.
8. Presupuestos versionados.
9. Snapshots de costes.
10. Notificaciones.
11. Políticas de privacidad y retención.
12. Validación de UX con usuarios reales.

---

## 33. Riesgos

### Falsos positivos

Mitigación:

- umbrales configurables;
- histórico suficiente;
- comparación por unidad;
- contexto de volumen;
- feedback del usuario.

### Matching incorrecto

Mitigación:

- no aprobar relaciones dudosas;
- mostrar referencia y descripción;
- conservar confianza;
- revisión manual.

### Exceso de alertas

Mitigación:

- priorizar severidad;
- resumen periódico;
- aprendizaje de decisiones;
- excepciones temporales.

### Contaminación del histórico

Mitigación:

- cuarentena;
- baselines solo con observaciones válidas;
- auditoría;
- posibilidad de recalcular.

### Confusión entre gasto real y precio de referencia

Mitigación:

- interfaz clara;
- factura registrada por un lado;
- referencia aprobada por otro.

### Responsabilidad comercial

Mitigación:

- no afirmar que existe error;
- mostrar “posible anomalía”;
- usuario confirma;
- conservar evidencia.

---

## 34. Criterios de aceptación funcionales futuros

La futura V1 se considerará válida si:

- registra facturas aunque existan alertas;
- no exige asignar compras a trabajos;
- calcula coste neto unitario comparable;
- conserva tarifa y descuento por separado cuando existan;
- detecta desaparición o reducción de descuento;
- detecta subidas bruscas;
- detecta cambios de unidad o formato;
- bloquea el uso automático de observaciones críticas;
- permite revisión manual;
- conserva auditoría;
- actualiza baselines solo según reglas;
- avisa de presupuestos afectados;
- no modifica presupuestos aceptados;
- no modifica facturas emitidas;
- funciona con aislamiento por empresa;
- explica cada alerta con cifras.

---

## 35. Límites estrictos para la fase documental

No hacer ahora:

- no crear migraciones;
- no crear tablas reales;
- no implementar endpoints;
- no modificar el escáner;
- no tocar presupuestos;
- no crear automatizaciones;
- no enviar emails;
- no cambiar precios reales;
- no tocar Stripe;
- no tocar Supabase de producción;
- no tocar Vercel;
- no ejecutar deploy;
- no presentar el módulo como disponible;
- no prometer detección infalible;
- no usar datos reales sin autorización.

---

## 36. Incorporación al roadmap

Ubicación recomendada:

`Future Product Intelligence / Purchasing / Margin Protection`

Nombre de iniciativa:

`SUPPLIER_PRICE_GUARD_V1`

Etiquetas sugeridas:

- `future`
- `research`
- `pro-feature`
- `supplier-invoices`
- `ocr`
- `price-intelligence`
- `margin-protection`
- `human-in-the-loop`

Documentos relacionados:

- `job-cost-learning-and-price-intelligence-v1.md`
- `competitor-acquisition-study-v1.md`
- futuro estudio de necesidades por oficio;
- futura especificación del escáner de gastos.

---

## 37. Propuesta de valor

Mensaje interno:

> El escáner no se limita a archivar gastos: convierte cada factura de proveedor en una observación de mercado privada para la empresa.

Mensaje comercial futuro:

> **Detecta subidas, descuentos perdidos y posibles errores antes de que reduzcan tu margen.**

Mensaje prudente:

> **Te avisamos cuando un precio se sale de lo habitual. Tú revisas y decides.**

---

## 38. Instrucciones para Codex al incorporar este documento

Tarea exclusivamente documental:

1. Crear `docs/research/supplier-price-guard-v1.md` o usar la carpeta equivalente del repositorio.
2. Añadirlo al índice documental.
3. Añadir una referencia al roadmap futuro, sin abrir fase activa.
4. Marcarlo como `FUTURE / RESEARCH / NOT IMPLEMENTED`.
5. Relacionarlo con el documento de aprendizaje de trabajos.
6. No implementar código ni infraestructura.

Validaciones recomendadas:

- `git diff --check`;
- validación documental existente;
- `npm run check:migrations` si existe;
- no ejecutar deploy.

Resumen final esperado:

- rama;
- archivos creados o modificados;
- validaciones;
- confirmación de que no se tocó código funcional, migraciones, Stripe, Supabase, Vercel ni producción.
