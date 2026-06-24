# Investigacion de importadores de software de facturacion en Espana

> Documento de investigacion futura. No implica implementacion inmediata ni compromiso comercial. Cualquier desarrollo derivado debera validarse con datos reales anonimizados, revision tecnica, revision legal/fiscal cuando aplique y respeto a la integridad documental de Factura Autonomo.

> Documento de investigacion. No implica implementacion inmediata. Las estructuras descritas deben validarse con exportaciones reales anonimizadas antes de crear importadores productivos.

**Version:** v1
**Fecha:** 2026-06-24
**Uso previsto:** documento futuro para disenar importadores, no especificacion cerrada de desarrollo.

## Criterios y cautelas

- Se priorizan fuentes oficiales de producto, soporte o documentacion publica.
- Donde no hay columnas publicas, se marca como **inferido** o **pendiente de muestra real**.
- No se propone scraping ni automatizacion contra servicios de terceros sin API o consentimiento explicito del usuario.
- Los documentos emitidos, bloqueados o historicos de Factura Autonomo no deben renumerarse, sobrescribirse ni recalcularse durante una importacion.
- Las importaciones futuras deben mantener snapshots historicos y respetar las reglas de integridad documental ya definidas en Fase 2.
- Este documento no contiene secretos ni datos personales reales.

## 1. Resumen ejecutivo

El importador mas rentable para Factura Autonomo no debe empezar por un programa concreto, sino por una arquitectura comun capaz de:

1. detectar el origen probable;
2. leer Excel, CSV, XLSX oficial AEAT, ZIP documental y, mas adelante, APIs;
3. normalizar facturas, presupuestos, gastos, clientes, proveedores y productos;
4. previsualizar y validar antes de importar;
5. importar historico sin alterar documentos ya emitidos o bloqueados.

La investigacion apunta a cinco candidatos P0:

| Candidato | Motivo principal | Formatos esperados | Prioridad | Confianza |
| --- | --- | --- | --- | --- |
| Excel / CSV generico + libros AEAT | Cubre plantillas propias y exportaciones de muchos programas | XLSX, CSV | P0 | Alta para AEAT, variable para Excel propio |
| Contasimple | Muy alineado con autonomos; exportacion avanzada y libros | Excel, XLSX, CSV, PDF, ZIP, FacturaE XML, SUENLACE.DAT | P0 | Alta para disponibilidad; columnas exactas pendientes |
| Quipu | Popular en autonomos y pymes; exporta ingresos/gastos/contactos | Excel, CSV, ZIP, PDF | P0 | Alta para formatos; columnas pendientes |
| Holded | Muy usado; exportacion por items puede recuperar lineas | Excel, Google Sheets, PDF | P0 | Alta para exportacion; complejidad media |
| FacturaDirecta | Exporta listados y tiene API publica | Excel, CSV, PDF, JSON API | P0 | Alta |

P1 recomendado: Billin, Cuentica, STEL Order, DELSOL/FactuSOL y a3/Wolters Kluwer.
P2 recomendado: Anfix, Sage, Odoo, FacturaScripts/factura.city y Qonto como importador documental o bancario.

## 2. Ranking de candidatos

### P0 - Importadores que conviene disenar primero

#### 1. Excel / CSV generico + libros oficiales AEAT

Base necesaria para todos los demas. Muchos programas exportan listados a Excel/CSV y la AEAT publica disenos normalizados en XLSX para libros registro. Es util para historico fiscal, aunque no siempre permite reconstruir lineas completas ni PDFs.

**Estrategia recomendada:** crear un importador generico con mapeo flexible, deteccion de cabeceras, hojas normalizadas y validacion de totales.

#### 2. Contasimple

Muy buen candidato para Factura Autonomo por perfil de usuario, exportacion a Excel, libros oficiales, FacturaE y enlace a3ASESOR con `SUENLACE.DAT`.

**Decision actual:** mantenerlo como P0, pero usar como fuente principal la exportacion avanzada Excel. `SUENLACE.DAT` debe tratarse como apoyo contable, no como reconstruccion completa de facturas.

#### 3. Quipu

Candidato P0 por popularidad en autonomos/pymes y exportaciones de ingresos, gastos, contactos y documentos.

**Estrategia recomendada:** ingresos/gastos Excel/CSV + ZIP de documentos, con enlace documental si los nombres o IDs lo permiten.

#### 4. Holded

Mas complejo por su perfil ERP, pero muy relevante. La exportacion por items es especialmente valiosa para recuperar lineas de documento.

**Estrategia recomendada:** distinguir exportacion de cabeceras, exportacion por items y libros oficiales.

#### 5. FacturaDirecta

Interesante por exportacion de listados y API REST. La exportacion depende de columnas visibles, por lo que el importador debe detectar campos faltantes.

**Estrategia recomendada:** empezar por CSV/Excel; dejar API para una fase posterior con consentimiento explicito.

### P1 - Buen potencial, muestras necesarias

| Software | Motivo | Riesgo principal |
| --- | --- | --- |
| Billin | Perfil autonomo/micropyme, FacturaE, OCR, Excel | Columnas no publicas |
| Cuentica | Exporta facturas/gastos/cobros/clientes en Excel/PDF/ZIP | Posible falta de lineas |
| STEL Order | Servicios, SAT, compras, recibos, productos vendidos | Mezcla de facturacion y operativa de servicio |
| DELSOL / FactuSOL | Muy presente en desktop/pyme | Versiones, plantillas tecnicas y codigos internos |
| a3/Wolters Kluwer | Relevante para asesorias | `SUENLACE.DAT` es contable, no documento completo |

### P2 - Para mas adelante

| Software | Motivo para esperar |
| --- | --- |
| Anfix | Exportaciones utiles, pero estructura completa no documentada publicamente |
| Sage 50 / Sage Active | ERP/contabilidad, mezcla de gestion y asientos |
| Odoo Espana | Muy flexible y personalizable; requiere modelo por version/modulos |
| FacturaScripts / factura.city | Interesante como origen tecnico/open source, menor prioridad inicial |
| Qonto Facturacion | Mas orientado a PDF, anexos y banca que a facturas estructuradas |

## 3. Fichas por software

### 3.1 Excel / CSV generico + libros oficiales AEAT

**Usuario objetivo:** autonomos, asesorias, pymes y usuarios con plantillas propias.

**Datos exportables encontrados:** libros registro de IVA e IRPF, facturas expedidas, recibidas, bienes de inversion, ventas/ingresos y compras/gastos.

**Formatos:** XLSX oficial AEAT; CSV/XLSX generico desde programas o plantillas propias.

**Estructura:**

- **Confirmado:** libros AEAT en XLSX con hojas normalizadas segun tipo de libro.
- **Inferido:** numero, fecha, identificacion fiscal, nombre, base, cuota, tipo impositivo, retenciones y total aparecen en distintas variantes.
- **Pendiente de muestra:** columnas reales de Excel propio, nombres de hojas modificados, formulas, filas de totales.

**Problemas esperables:** fechas espanolas, decimales con coma, formulas, filas resumen, varias actividades, hojas renombradas, columnas vacias.

**Prioridad:** P0.

### 3.2 Contasimple

**Empresa:** Cegid / Cegid Contasimple.
**Usuario objetivo:** autonomo, micropyme, pequeno negocio y asesoria colaborativa.
**Encaje:** muy alto.

**Exportaciones encontradas:**

| Dato | Formato | Estado |
| --- | --- | --- |
| Facturas emitidas | Excel avanzado | Confirmado como area exportable; columnas exactas pendientes |
| Facturas recibidas | Excel avanzado | Confirmado como area exportable; columnas exactas pendientes |
| Gastos | Excel avanzado | Confirmado como area exportable; columnas exactas pendientes |
| Bienes de inversion | Excel avanzado | Confirmado |
| Amortizaciones | Excel avanzado | Confirmado |
| Libros IVA/IRPF | XLSX/CSV/SII segun documentacion | Confirmado |
| Exportacion gestor a3 | ZIP con `SUENLACE.DAT` | Confirmado |
| FacturaE | XML FacturaE 3.2 | Confirmado |
| PDF | PDF | Confirmado como funcionalidad; exportacion masiva pendiente |

**Estructuras a soportar:**

- **Confirmado por documentacion de importacion:** una fila por factura con cabecera y totales.
- **Confirmado por documentacion de importacion:** varias filas por factura o formato por conceptos.
- **Confirmado:** bases y cuotas por tipo de IVA en plantillas de importacion.
- **Pendiente:** si el Excel avanzado exportado incluye lineas completas o solo cabeceras/totales.

**Columnas confirmadas para plantillas de importacion Contasimple:**

- numero de factura/gasto;
- fecha;
- estado;
- tipo de ingreso/gasto;
- tipo de operacion;
- base imponible por porcentaje de IVA;
- cuota IVA por porcentaje de IVA;
- NIF de cliente/proveedor.

**Campos inferidos para exportacion avanzada:** nombre o razon social, direccion, serie, total, IRPF, recargo de equivalencia, vencimiento, metodo de pago, estado de cobro/pago y referencia rectificativa. Deben validarse con muestra real.

**Reglas especificas futuras:**

1. No renumerar facturas importadas.
2. Conservar serie y numero originales.
3. Crear snapshots historicos por documento.
4. No fusionar clientes automaticamente.
5. No recalcular totales como fuente de verdad; solo validar.
6. Agrupar por conceptos si el Excel viene en varias filas.
7. Crear linea resumen si no hay lineas reales.
8. Detectar rectificativas por serie, importe negativo o referencia.
9. No crear movimientos bancarios desde cobros/pagos sin confirmacion.
10. Tratar `SUENLACE.DAT` como fuente contable secundaria.

**Prioridad:** P0.

### 3.3 Quipu

**Usuario objetivo:** autonomos, pymes y asesorias conectadas.

**Datos exportables encontrados:** ingresos, gastos, contactos y documentos.

**Formatos:** Excel, CSV, ZIP, PDF/adjuntos.

**Estructura:**

- **Confirmado:** exportacion separada de ingresos/gastos en Excel o CSV.
- **Confirmado:** descarga comprimida de documentos.
- **Inferido:** numero, fecha, cliente/proveedor, NIF, concepto, base, IVA, total, estado de cobro/pago, categoria.
- **Pendiente:** lineas completas, adjuntos enlazados por ID y columnas exactas.

**Riesgos:** tickets mezclados con facturas, categorias internas, PDFs sin ID claro, estados de cobro/pago separados.

**Prioridad:** P0.

### 3.4 Holded

**Usuario objetivo:** pyme, autonomo avanzado, ERP ligero, inventario y asesorias.

**Datos exportables encontrados:** facturas de venta, compras, libros, inventario, pedidos, albaranes, asientos, cuentas y activos.

**Formatos:** Excel, PDF, Google Sheets y exportacion por items.

**Estructura:**

- **Confirmado:** exportaciones de documentos y libros.
- **Confirmado:** modalidad por items en documentos comerciales.
- **Inferido:** numero, fecha, cliente/proveedor, NIF, SKU, descripcion, cantidad, precio, descuento, IVA, total, estado, tags.
- **Pendiente:** columnas exactas de facturas de venta/compra por items.

**Riesgos:** tags, campos personalizados, inventario, multiempresa, varias monedas, documentos convertidos desde pedidos/albaranes.

**Prioridad:** P0.

### 3.5 FacturaDirecta

**Usuario objetivo:** autonomo, pyme y asesoria sencilla.

**Datos exportables encontrados:** listados de facturas, compras, contactos, productos, bancos, informes y actividad; API REST publica.

**Formatos:** Excel, CSV, PDF y JSON via API.

**Estructura:**

- **Confirmado:** exporta lo visible en el listado, respetando filtros y columnas.
- **Inferido:** numero, fecha, contacto, estado, base, IVA, total, vencimiento, cobro/pago, etiquetas.
- **Pendiente:** exportacion completa con todas las columnas visibles y si hay lineas separadas.

**Riesgos:** vistas incompletas, columnas ocultas, filtros mal aplicados, API con credenciales.

**Prioridad:** P0.

### 3.6 Billin / TeamSystem Facturas Billin

**Usuario objetivo:** autonomo, micropyme y gestoria.

**Datos exportables encontrados:** facturas, tickets, gastos, productos/servicios, clientes, OCR y FacturaE.

**Formatos:** Excel, PDF y XML FacturaE.

**Estructura:**

- **Confirmado:** existe Excel utilizable por terceros en importaciones DELSOL.
- **Confirmado:** FacturaE y OCR como capacidades del producto.
- **Inferido:** numero, fecha, cliente/proveedor, NIF, concepto, base, IVA, total, estado, producto/servicio.
- **Pendiente:** esquema real de Excel Billin.

**Prioridad:** P1.

### 3.7 Cuentica

**Usuario objetivo:** autonomos, profesionales y pequena empresa.

**Datos exportables encontrados:** facturas, gastos, cobros/pagos, clientes y proveedores.

**Formatos:** Excel, PDF y ZIP.

**Estructura:**

- **Confirmado:** exportacion de datos en Excel/PDF/ZIP.
- **Inferido:** numero, fecha, cliente, NIF, total, estado, cobros/pagos, categoria fiscal.
- **Pendiente:** columnas exactas y estructura del ZIP.

**Prioridad:** P1.

### 3.8 STEL Order

**Usuario objetivo:** autonomos, pymes de servicios, SAT, instaladores, mantenimiento y comercio con catalogo.

**Datos exportables encontrados:** clientes, proveedores, productos, servicios, activos, libros de facturas, compras, recibos proveedor y productos vendidos.

**Formatos:** XLS/XLSX, CSV, PDF y Excel resumen.

**Estructura:**

- **Confirmado:** exportacion de maestros y resumentes.
- **Confirmado para productos vendidos:** referencia de producto, referencia de documento, cliente, precio unitario y precio total.
- **Inferido:** fecha, numero, estado, NIF, base, IVA, total, vencimiento, tecnico/proyecto/activo.
- **Pendiente:** facturas completas y relacion entre resumen de lineas y cabecera fiscal.

**Prioridad:** P1.

### 3.9 Software DELSOL / FactuSOL / ContaSOL

**Usuario objetivo:** pyme, comercio, asesoria y usuarios desktop/locales.

**Datos exportables encontrados:** clientes, proveedores, articulos, facturas emitidas, recibidas, pagos/cobros/recibos y ficheros contables.

**Formatos:** Excel, CSV, XLSX/XLS, ODS/Calc y PDF.

**Estructura:**

- **Confirmado:** plantillas tecnicas de importacion/exportacion accesibles desde la aplicacion.
- **Inferido:** codigos internos, numero, fecha, base, IVA, total, cuenta contable, forma de pago.
- **Pendiente:** columnas exactas por version.

**Prioridad:** P1.

### 3.10 a3ASESOR / a3factura / Wolters Kluwer

**Usuario objetivo:** asesorias, gestorias y pymes con despacho.

**Datos exportables encontrados:** ventas, compras, tickets, articulos, libros oficiales, Excel/PDF y `SUENLACE.DAT`.

**Formatos:** Excel, PDF y `SUENLACE.DAT`.

**Estructura:**

- **Confirmado:** `SUENLACE.DAT` como enlace contable.
- **Inferido:** asientos con cuentas, fechas, importes, NIF/cuentas de terceros, bases e impuestos.
- **Pendiente:** Excel a3factura real y detalle de facturas completas.

**Prioridad:** P1/P2 segun foco comercial.

### 3.11 Anfix

**Usuario objetivo:** autonomo, empresa y asesoria.

**Datos exportables encontrados:** listados de facturas emitidas, compras desde libros IVA, documentos e informes.

**Formatos:** Excel, PDF y CSV en informes.

**Estructura:**

- **Confirmado:** listados descargables.
- **Inferido:** numero, fecha, cliente/proveedor, base, IVA, total y categoria.
- **Pendiente:** lineas, adjuntos y maestros.

**Prioridad:** P2.

### 3.12 Sage 50 / Sage Active

**Usuario objetivo:** pyme, ERP, comercio y asesoria.

**Datos exportables encontrados:** clientes/proveedores, articulos, facturas, asientos, diario, PDFs y XML contable en productos Sage relacionados.

**Formatos:** Excel, CSV, PDF y XML contable.

**Estructura:**

- **Confirmado:** exportaciones de listados y diario/asientos.
- **Inferido:** cuenta contable, codigo tercero, documento, fecha, debe/haber, base/IVA y articulo.
- **Pendiente:** exportaciones completas de facturas de ventas/compras y version exacta.

**Prioridad:** P2.

### 3.13 Odoo Espana

**Usuario objetivo:** ERP, pyme, empresa con procesos personalizados, inventario y contabilidad.

**Datos exportables encontrados:** objetos empresariales exportables, contactos, productos, asientos, pedidos, facturas, Facturae/FACe y libros IVA.

**Formatos:** CSV, XLSX, PDF y XML Facturae.

**Estructura:**

- **Confirmado:** importacion/exportacion generica por objetos.
- **Inferido:** `account.move`, lineas, partners, impuestos, productos, diarios y estados.
- **Pendiente:** version, modulos, campos personalizados y exports reales.

**Prioridad:** P2.

### 3.14 FacturaScripts / factura.city

**Usuario objetivo:** pyme tecnica, open source y migraciones desde otros programas.

**Datos exportables encontrados:** listados a PDF/Excel/CSV y plugins para descargar productos, proveedores, clientes, contactos y facturas.

**Formatos:** Excel, CSV, PDF y ZIP segun plugin.

**Estructura:**

- **Confirmado:** listados y plugins de exportacion.
- **Inferido:** estructura relacional con clientes, proveedores, productos, facturas y lineas.
- **Pendiente:** export de plugin Exporter con facturas y lineas.

**Prioridad:** P2 / watchlist.

### 3.15 Qonto Facturacion

**Usuario objetivo:** autonomo/pyme con banco integrado.

**Datos exportables encontrados:** facturas cliente/proveedor, anexos/transacciones y contabilidad bancaria.

**Formatos:** PDF, ZIP/PDF, Excel contable, OFX/QIF banco.

**Estructura:**

- **Confirmado:** PDF de facturas y Excel contable por diarios.
- **Inferido:** movimientos con fecha, importe, contraparte, categoria y adjunto.
- **Pendiente:** si existe exportacion XLSX/CSV estructurada de facturas con lineas e impuestos.

**Prioridad:** no priorizar como importador fiscal; valorar futuro importador documental/bancario.

## 4. Mapeo preliminar a Factura Autonomo

### 4.1 Facturas emitidas

| Dato externo | Destino en Factura Autonomo | Estado | Riesgo |
| --- | --- | --- | --- |
| Numero y serie | Numero/serie historicos del documento | Confirmado como necesario | Alto |
| Fecha de emision | Fecha documento | Confirmado como necesario | Medio |
| Fecha operacion/devengo | Campo fiscal futuro o metadato | Inferido segun origen | Medio |
| Cliente nombre/razon social | Snapshot del cliente en documento | Confirmado como necesario | Alto |
| NIF/CIF/VAT cliente | Identificacion fiscal snapshot | Confirmado como necesario | Alto |
| Direccion cliente | Snapshot fiscal | Pendiente segun origen | Medio |
| Concepto/descripcion | Linea o linea resumen | Pendiente segun formato | Medio |
| SKU/producto | Producto o referencia externa | Pendiente | Medio |
| Cantidad/precio/descuento | Lineas del documento | Pendiente | Alto |
| Base/IVA/IRPF/RE | Desglose fiscal | Confirmado como necesario | Alto |
| Total | Total documento | Confirmado como necesario | Alto |
| Estado cobro | Estado informativo o recibo propuesto | Inferido | Medio |
| Rectificativa/abono | Tipo y referencia | Pendiente por origen | Alto |
| PDF/XML | Adjunto/evidencia | Pendiente | Medio |

### 4.2 Facturas recibidas y gastos

| Dato externo | Destino en Factura Autonomo | Estado | Riesgo |
| --- | --- | --- | --- |
| Numero proveedor | Numero externo | Confirmado como necesario | Alto |
| Fecha factura | Fecha gasto | Confirmado como necesario | Medio |
| Proveedor | Proveedor snapshot/candidato | Confirmado como necesario | Medio |
| NIF proveedor | Identificacion fiscal | Confirmado como necesario | Medio |
| Categoria | Categoria sugerida | Inferido | Medio |
| Base/IVA/IRPF/total | Totales gasto | Confirmado como necesario | Alto |
| Deducible/no deducible | Fiscalidad futura | Pendiente | Alto |
| PDF/ticket | Adjunto/evidencia | Pendiente | Medio |
| Estado pago | Pago informativo | Inferido | Medio |

### 4.3 Clientes, proveedores y productos

| Entidad externa | Destino | Regla recomendada |
| --- | --- | --- |
| Cliente | Cliente candidato + snapshot en documentos | No fusionar automaticamente; sugerir duplicados por NIF |
| Proveedor | Proveedor candidato | No asumir deducibilidad ni categoria fiscal |
| Producto/servicio | Catalogo candidato | No aplicar a documentos historicos ya importados |
| Cuenta contable | Metadato externo | Conservar para trazabilidad, no exponer como dato principal |
| Stock | Campo futuro o ignorado controlado | No activar inventario automaticamente |

## 5. Patrones comunes de exportacion

1. **Una fila por factura.** Facil para historico fiscal, pobre para lineas y productos.
2. **Cabecera repetida por linea.** Mejor para reconstruccion completa; requiere agrupar y validar.
3. **Varias pestanas XLSX.** Comun en AEAT, Contasimple y plantillas avanzadas.
4. **Libros registro.** Buenos para fiscalidad, no equivalen a migracion documental completa.
5. **ZIP con PDFs.** Evidencia documental; no fuente principal si existe Excel/CSV estructurado.
6. **Formatos de asesoria.** `SUENLACE.DAT`, A3, ContaPlus/Sage y similares son contables.
7. **API oficial.** Util mas adelante, con consentimiento, limites y credenciales.

## 6. Riesgos de importacion

### Tecnicos

- Fechas en varios formatos o serial Excel.
- Decimales con coma, punto, separadores de miles o moneda.
- Una factura en varias filas.
- Varios tipos de IVA y retenciones en el mismo documento.
- IRPF, recargo de equivalencia, inversion del sujeto pasivo, exportaciones e intracomunitarias.
- PDFs sin datos estructurados.
- ZIPs sin enlace fiable entre PDF y fila.
- Columnas ocultas, filtros activos o exportaciones parciales.
- Campos personalizados por programa.

### Fiscales

- Confundir factura, presupuesto, proforma, ticket, albaran o abono.
- Tratar rectificativas como simples facturas negativas.
- Rehacer numeracion historica.
- Perder fecha de operacion/devengo.
- Marcar gastos como deducibles sin validacion.
- No conservar PDF/FacturaE original cuando existe.

### Integridad documental

- Modificar documentos emitidos o bloqueados.
- Fusionar clientes/proveedores y alterar snapshots historicos.
- Recalcular totales con redondeos distintos al origen.
- Crear cobros/pagos reales sin confirmacion.
- Importar varias empresas en una sola cuenta.
- Reimportar encima sin detectar duplicados.

## 7. Recomendaciones para nuestro importador

1. **Detector de origen.** Por nombre de archivo, hojas, cabeceras y patrones.
2. **Pipeline por fases.** `parse -> normalize -> group -> validate -> preview -> confirm -> import report`.
3. **Mapper flexible.** Equivalencias para NIF/CIF/VAT, cliente/contacto/tercero, base/subtotal, etc.
4. **Agrupacion robusta.** Serie + numero + fecha + NIF + tipo documento.
5. **Validacion de importes.** Lineas, bases, cuotas, retenciones, total y tolerancia de redondeo.
6. **Validacion fiscal.** IVA, IRPF, recargo, exentos, inversion sujeto pasivo, rectificativas y simplificadas.
7. **Importacion historica bloqueada.** No emitir de nuevo ni renumerar documentos importados.
8. **Backup previo obligatorio.** Especialmente si hay datos existentes.
9. **Previsualizacion obligatoria.** Totales, errores, duplicados, clientes nuevos y warnings.
10. **Confirmacion explicita.** Separar analizar archivo de importar.
11. **Informe postimportacion.** Archivo fuente, hash, fecha, usuario, errores y descartes.
12. **Respeto a Fase 2.** No tocar documentos emitidos, locked, snapshots ni hashes existentes.
13. **Adjuntos como evidencia.** PDF/XML/ZIP se vinculan, no sustituyen datos estructurados sin revision.

## 8. Muestras reales necesarias

### Paquete minimo comun

1. Facturas emitidas Excel/CSV.
2. Facturas recibidas/gastos Excel/CSV.
3. Clientes exportados.
4. Proveedores exportados.
5. Productos/servicios exportados.
6. Factura de una linea.
7. Factura de varias lineas.
8. Factura multi-IVA.
9. Factura con IRPF.
10. Factura con recargo de equivalencia, si aplica.
11. Rectificativa/abono.
12. Factura simplificada/ticket.
13. Cliente extranjero o intracomunitario.
14. ZIP con PDFs/adjuntos.
15. Libros oficiales AEAT, si existen.
16. Datos anonimizados manteniendo estructura, fechas, importes y formatos.

### Muestras por software

| Software | Muestras prioritarias |
| --- | --- |
| Contasimple | Exportacion avanzada Excel, libros registro, emitidas/recibidas/gastos, clientes/proveedores, productos, ZIP `SUENLACE.DAT`, FacturaE XML |
| Quipu | Ingresos Excel/CSV, gastos Excel/CSV, ZIP documentos, contactos |
| Holded | Ventas normal, ventas por items, compras normal, compras por items, libros, contactos, productos |
| FacturaDirecta | Listados completos con todas las columnas visibles, ventas/compras/contactos/productos |
| Billin | Excel Billin, facturas, gastos/tickets, clientes, productos, OCR exportado, XML FacturaE |
| Cuentica | Facturas Excel, ZIP PDFs, gastos, cobros/pagos, clientes/proveedores |
| STEL Order | Maestros, libro facturas emitidas, compras, recibos proveedor, productos vendidos |
| DELSOL/FactuSOL | Ventas, compras, clientes, proveedores, articulos, cobros/pagos, plantillas tecnicas |
| a3/Wolters | Excel a3factura, libros oficiales, `SUENLACE.DAT`, tickets, articulos |
| Anfix | Ventas Excel, compras/libros IVA, informes, clientes/proveedores |
| Sage | Ventas/compras, clientes/proveedores, articulos, diario CSV, libros IVA, PDFs |
| Odoo | Facturas cliente, lineas, facturas proveedor, partners, productos, impuestos, XML Facturae/PDF |
| Qonto | PDF, Excel contable, OFX/QIF banco y anexos |
| FacturaScripts | Excel/CSV con facturas y lineas, clientes, proveedores, productos, ZIP PDFs |

## 9. Dudas pendientes

1. Columnas exactas de exportacion por programa y plan.
2. Si cada software exporta lineas completas o solo cabeceras.
3. Como se enlazan PDFs/ZIPs con filas del Excel.
4. Si Contasimple exporta clientes/productos con la misma estructura que sus plantillas de importacion.
5. Si `SUENLACE.DAT` aporta detalle suficiente o solo asientos.
6. Diferencias entre versiones cloud/local.
7. Como se representan rectificativas, abonos, simplificadas y tickets.
8. Como se exportan IRPF, recargo de equivalencia, operaciones exentas e intracomunitarias.
9. Como importar pagos/cobros sin crear movimientos bancarios falsos.
10. Que consentimiento o licencia se necesita para APIs oficiales.
11. Como detectar y separar multiempresa.
12. Como presentar conflictos sin permitir sobrescrituras peligrosas.

## 10. Anexo de fuentes

### Fuentes oficiales o documentacion de producto citadas en el informe recibido

- Agencia Tributaria: libros registro IVA/IRPF y formato electronico comun XLSX.
- Contasimple/Cegid: exportacion a Excel, libros registro, `SUENLACE.DAT`, FacturaE e importacion de facturas.
- Quipu/TeamSystem: manual de usuario con exportacion de ingresos/gastos.
- Holded Academy: exportacion de facturas, libros, inventario y documentos por items.
- FacturaDirecta: exportacion de listados/datos y API publica.
- Billin/TeamSystem: producto, FacturaE, OCR e importaciones relacionadas con DELSOL.
- Cuentica: descarga de datos en Excel/PDF/ZIP.
- STEL Order: exportacion de datos, facturacion, compras y productos vendidos.
- TeamSystem DELSOL: exportaciones, plantillas tecnicas e importaciones Excel/Calc.
- Wolters Kluwer a3Responde: Excel, libros oficiales y `SUENLACE.DAT`.
- Anfix: listados y libros IVA.
- Sage: exportacion de listados/asientos y productos Sage.
- Odoo: exportacion/importacion de datos y localizacion espanola.
- Qonto: exportacion de facturas, contabilidad, transacciones y anexos.
- FacturaScripts/factura.city: exportacion/importacion Excel/CSV y plugins.

### Enlaces principales conservados del informe base

- Agencia Tributaria - libros registro de IVA: https://sede.agenciatributaria.gob.es/Sede/iva/libros-registro.html
- Contasimple - exportar datos: https://www.contasimple.com/academia/como-exportar-datos/
- Contasimple - exportacion A3: https://www.contasimple.com/academia/como-exportar-datos-a3asesor/
- Contasimple - importar facturas: https://www.contasimple.com/academia/importar-facturas-recibidas/
- Quipu - manual usuario: https://getquipu.com/Manual-de-usuario-de-Quipu-2-0.pdf
- Holded - gestionar facturas de venta: https://help.holded.com/es/articles/6877413-gestionar-tus-facturas-de-venta
- FacturaDirecta - exportar listados y datos: https://help.facturadirecta.com/es/articles/1070827-exportar-listados-y-datos
- FacturaDirecta - API publica: https://help.facturadirecta.com/es/articles/13538823-api-publica-de-facturadirecta
- STEL Order - exportar datos: https://help.stelorder.com/hc/es/articles/7286180325405-Exportar-datos-de-STEL-Order
- Odoo - exportar e importar datos: https://www.odoo.com/documentation/18.0/es_419/applications/essentials/export_import_data.html
- FacturaScripts - exportar facturas con lineas: https://facturascripts.com/publicaciones/exportar-listado-completo-de-facturas-con-lineas
