# Funcionalidades de competidores no cubiertas por Factura Autonomo

> Documento de investigacion futura. No implica implementacion inmediata ni compromiso comercial. Cualquier desarrollo derivado debera validarse con datos reales anonimizados, revision tecnica, revision legal/fiscal cuando aplique y respeto a la integridad documental de Factura Autonomo.

**Version:** v1
**Fecha:** 2026-06-24
**Base:** investigacion de importadores de software de facturacion en Espana + documentacion tecnica actual del proyecto.
**Estado:** documento tecnico de oportunidades. No implica implementacion inmediata.

## 1. Objetivo

Este documento convierte la investigacion de competidores en un listado de posibles funcionalidades futuras para Factura Autonomo. No es una promesa comercial ni un roadmap cerrado.

La comparacion se hace contra el estado documentado de Factura Autonomo: facturas, presupuestos, recibos, gastos, proveedores, clientes, resumen fiscal orientativo, PDF, snapshots, integridad documental, importador PC Facturacion 3.0, IA para gastos/clientes, Stripe, Supabase opcional y Veri*Factu parcial.

## 2. Criterios de clasificacion

| Prioridad | Significado |
| --- | --- |
| P0 | Encaja con autonomos y refuerza la propuesta principal |
| P1 | Valioso, pero requiere base tecnica o muestras reales |
| P2 | Interesante para expansion, no urgente |
| No priorizar | Puede distraer del producto simple para autonomos |

| Estado en Factura Autonomo | Significado |
| --- | --- |
| Existe | Ya hay funcionalidad equivalente razonable |
| Parcial | Hay una parte, pero falta profundidad o robustez |
| No existe | No hay funcionalidad equivalente |
| Futuro condicionado | Depende de normativa, muestras, APIs o decisiones legales |

## 3. Resumen de gaps principales

| Area | Competidores que lo sugieren | Estado actual | Prioridad |
| --- | --- | --- | --- |
| Importador Excel/CSV generico | Casi todos | Parcial: solo PC Facturacion MDB | P0 |
| Importadores por software origen | Contasimple, Quipu, Holded, FacturaDirecta, DELSOL | Parcial | P0 |
| Previsualizacion avanzada de importacion | FacturaScripts/factura.city como referencia de mapeo | Parcial | P0 |
| Adjuntos documentales importados | Quipu, Cuentica, Qonto, Billin | No existe de forma completa | P0/P1 |
| Exportacion FacturaE / importacion XML | Contasimple, Billin, Odoo | No existe o no esta documentada como flujo completo | P1 |
| Libros oficiales AEAT y modelos | Contasimple, Quipu, Anfix, a3, Holded | Parcial: resumen y export Pro orientativos | P1 |
| Integracion bancaria | Qonto, Quipu, Sage, Contasimple | No existe | P1/P2 |
| Cobros/pagos parciales y conciliacion | Contasimple, Quipu, Cuentica, bancos | Parcial: marcar cobrado y recibos | P1 |
| Catalogo de productos/servicios | Holded, STEL, DELSOL, Billin, Contasimple | Parcial: lineas libres y unidades | P1 |
| Inventario/stock | Holded, STEL, DELSOL, Contasimple | No existe | P2 |
| Albaranes, pedidos y proformas | Holded, Odoo, STEL | Parcial: presupuestos; no pedidos/albaranes | P2 |
| Contabilidad/asientos/cuentas | a3, Sage, DELSOL, Holded | No existe | P2 |
| Multiempresa | Holded, Odoo, Sage, a3 | No existe | P2 |
| Multiusuario/roles/asesoria | Quipu, a3, Holded, Anfix | No existe | P1/P2 |
| API publica o conectores | FacturaDirecta, Odoo | No existe | P2 |
| Informes avanzados | Holded, Sage, Anfix, Quipu | Parcial | P1 |
| CRM/leads/proyectos/SAT | STEL, Holded, Odoo | No existe | No priorizar/P2 |

## 4. Funcionalidades candidatas por prioridad

### P0 - Alta alineacion con Factura Autonomo

#### 4.1 Importador Excel/CSV generico

**Inspirado por:** AEAT, Contasimple, Quipu, Holded, FacturaDirecta, Cuentica, DELSOL, FacturaScripts.

**Estado actual:** parcial. Existe un importador especializado para PC Facturacion 3.0, pero no un importador generico para Excel/CSV.

**Propuesta futura:**

- deteccion de hojas y cabeceras;
- mapeo visual de columnas;
- agrupacion por factura;
- validacion de IVA/IRPF/totales;
- previsualizacion;
- informe postimportacion;
- importacion historica bloqueada.

**Notas de integridad:** nunca debe renumerar ni modificar documentos emitidos/bloqueados existentes.

#### 4.2 Importadores por origen

**Inspirado por:** Contasimple, Quipu, Holded, FacturaDirecta y DELSOL.

**Estado actual:** parcial.

**Propuesta futura:**

- origen seleccionable por usuario;
- detector automatico como ayuda, no como decision irreversible;
- conectores por software encima del pipeline generico;
- cada conector debe tener muestras reales anonimizadas antes de entrar en produccion.

**Orden sugerido:** Contasimple, Quipu, Holded, FacturaDirecta, Excel/CSV AEAT, DELSOL.

#### 4.3 Previsualizacion avanzada antes de importar

**Inspirado por:** patrones de migracion de FacturaScripts/factura.city y necesidades detectadas en todos los programas.

**Estado actual:** parcial.

**Propuesta futura:**

- resumen por tipo de dato;
- errores y advertencias;
- duplicados probables;
- documentos sin lineas;
- clientes/proveedores nuevos;
- totales por periodo;
- decision explicita sobre facturas impagadas;
- backup obligatorio.

#### 4.4 Importacion de adjuntos como evidencia

**Inspirado por:** Quipu, Cuentica, Qonto, Billin, Contasimple y Holded.

**Estado actual:** no existe como flujo completo.

**Propuesta futura:**

- asociar PDF, FacturaE XML o ZIP a documentos importados;
- guardar hash y nombre original;
- no usar PDF como fuente principal si hay datos estructurados;
- permitir revisar adjuntos desde el documento.

**Dependencia:** modelo de adjuntos y almacenamiento local/nube.

### P1 - Muy utiles, pero con dependencias

#### 4.5 FacturaE XML

**Inspirado por:** Contasimple, Billin y Odoo/FACe.

**Estado actual:** no existe como flujo completo documentado.

**Propuesta futura:**

- exportar FacturaE para administraciones o clientes que lo pidan;
- importar FacturaE como fuente estructurada;
- conservar XML original como evidencia;
- validar contra esquema.

**Riesgo:** requiere compatibilidad legal/tecnica y validacion exhaustiva.

#### 4.6 Libros oficiales AEAT y modelos fiscales

**Inspirado por:** Contasimple, Quipu, Anfix, Holded, a3 y Sage.

**Estado actual:** parcial. Hay resumen fiscal orientativo y exportaciones Pro, pero no presentacion de modelos ni libros oficiales completos.

**Propuesta futura:**

- exportar libros IVA/IRPF en formato mas cercano a AEAT;
- preparar datos para modelos 303/130 sin presentacion automatica;
- separar claramente "preparacion" de "presentacion oficial".

**Nota:** no afirmar cumplimiento ni presentacion automatica sin validacion profesional.

#### 4.7 Cobros, pagos parciales y conciliacion

**Inspirado por:** Contasimple, Quipu, Cuentica, Qonto y bancos.

**Estado actual:** parcial. Se puede marcar una factura como cobrada y crear recibo, pero no hay pagos parciales ni conciliacion bancaria.

**Propuesta futura:**

- vencimientos multiples;
- pagos parciales;
- estado pendiente/parcial/pagado;
- conciliacion manual contra extractos;
- importacion bancaria OFX/QIF/CSV como fase posterior.

#### 4.8 Catalogo de productos y servicios

**Inspirado por:** Holded, STEL, DELSOL, Billin y Contasimple.

**Estado actual:** parcial. Hay lineas libres, unidades configurables y frases, pero no catalogo persistente de productos/servicios.

**Propuesta futura:**

- productos/servicios con codigo, descripcion, precio, IVA por defecto y unidad;
- selector rapido en lineas;
- importacion de catalogo;
- evitar cambiar documentos historicos al modificar producto.

#### 4.9 Multiusuario y rol asesor

**Inspirado por:** Quipu, a3, Anfix, Holded y ecosistemas de asesorias.

**Estado actual:** no existe. Una cuenta equivale a un negocio/usuario.

**Propuesta futura:**

- acceso asesor de solo lectura o exportacion;
- permisos por rol;
- invitaciones;
- historial de acciones.

**Dependencia:** servidor canonico y seguridad RLS avanzada.

#### 4.10 Informes avanzados

**Inspirado por:** Holded, Sage, Anfix, Quipu y Cuentica.

**Estado actual:** parcial. Hay panel fiscal, resumen, busquedas y exportaciones limitadas.

**Propuesta futura:**

- ingresos por cliente;
- gastos por proveedor/categoria;
- comparativa trimestral/anual;
- facturas pendientes/vencidas;
- rentabilidad simple;
- exportaciones configurables.

### P2 - Expansion o producto mas avanzado

#### 4.11 Inventario y stock

**Inspirado por:** Holded, STEL, DELSOL y Contasimple.

**Estado actual:** no existe.

**Valor:** util para comercio, menos para autonomos de servicios.

**Recomendacion:** no priorizar hasta tener catalogo de productos y usuarios que lo pidan.

#### 4.12 Albaranes, pedidos, partes de trabajo y SAT

**Inspirado por:** Holded, STEL y Odoo.

**Estado actual:** parcial por presupuestos, pero no hay ciclo pedido -> albaran -> factura.

**Valor:** alto para instaladores/SAT/comercio; bajo para autonomo simple.

**Recomendacion:** fase futura si se decide ampliar publico objetivo.

#### 4.13 Contabilidad, asientos y cuentas contables

**Inspirado por:** a3, Sage, DELSOL, Holded y Odoo.

**Estado actual:** no existe.

**Valor:** atractivo para asesorias, pero puede convertir la app en producto contable pesado.

**Recomendacion:** mejor exportacion para asesoria antes que contabilidad completa.

#### 4.14 API publica y conectores

**Inspirado por:** FacturaDirecta y Odoo.

**Estado actual:** no existe.

**Valor:** util para integraciones, pero requiere autenticacion, versionado, limites y soporte.

**Recomendacion:** esperar a tener modelo servidor canonico.

#### 4.15 Multiempresa

**Inspirado por:** Holded, Odoo, Sage y a3.

**Estado actual:** no existe.

**Valor:** util para asesorias o usuarios con varias actividades.

**Riesgo:** complica mucho sincronizacion, permisos, billing y Veri*Factu.

## 5. Funcionalidades que conviene no copiar todavia

| Funcionalidad | Motivo |
| --- | --- |
| ERP completo | Desvia el foco de autonomos |
| Nominas | Dominio legal distinto |
| TPV/stock avanzado | Requiere otro producto o modulo grande |
| Contabilidad completa | Riesgo alto de complejidad y responsabilidad |
| Scraping de competidores | No recomendable legal ni tecnicamente |
| Automatizar presentacion AEAT sin validacion | Alto riesgo fiscal/legal |
| Banca automatica sin consentimiento y seguridad reforzada | Alto riesgo de privacidad y cumplimiento |

## 6. Recomendacion de roadmap funcional

### Corto plazo

1. Terminar Fase 2 documental antes de ampliar importadores.
2. Definir modelo de adjuntos documentales.
3. Disenar importador Excel/CSV generico.
4. Pedir muestras reales anonimizadas de Contasimple, Quipu y Holded.
5. Implementar previsualizacion e informe postimportacion.

### Medio plazo

1. Importador Contasimple Excel avanzado.
2. Importador Quipu ingresos/gastos/contactos.
3. Importador Holded por items.
4. Exportacion AEAT mas formal.
5. Catalogo de productos/servicios.
6. Pagos parciales y vencimientos.

### Largo plazo

1. FacturaE.
2. Rol asesor.
3. Adjuntos nube.
4. Importadores API con consentimiento.
5. Conciliacion bancaria manual.
6. Multiempresa si el mercado lo justifica.

## 7. Relacion con integridad documental

Cualquier funcionalidad futura debe cumplir estas reglas:

- no modificar snapshots de documentos emitidos;
- no cambiar `documentSnapshot.customer` ni emisor historico;
- no recalcular hashes historicos;
- no renumerar documentos importados;
- no borrar fisicamente documentos emitidos/bloqueados;
- no fusionar clientes/proveedores afectando destinatarios historicos;
- no crear cobros, pagos o movimientos bancarios reales sin confirmacion explicita.

## 8. Dudas abiertas

1. Que publico queremos priorizar: autonomo simple, pyme pequena, asesorias o ERP ligero.
2. Si el plan Pro debe incluir importadores avanzados o si habra pack de migracion.
3. Donde se almacenaran adjuntos en modo local y modo nube.
4. Si FacturaE entra antes o despues de Veri*Factu servidor real.
5. Si queremos integracion asesor primero por exportacion o por usuario invitado.
6. Que limites de volumen tendra la importacion para evitar bloquear el navegador.
7. Como soportar importaciones multiempresa sin errores graves.

## 9. Siguiente decision recomendada

Antes de implementar nuevas funciones de competencia, conviene cerrar Fase 2A y definir:

1. modelo de adjuntos;
2. politica de documentos historicos importados;
3. pipeline comun de importacion;
4. conjunto minimo de muestras anonimizadas;
5. UX de previsualizacion y rollback.

Con eso, el primer desarrollo competitivo razonable seria el importador Excel/CSV generico y despues Contasimple como primer conector P0.
