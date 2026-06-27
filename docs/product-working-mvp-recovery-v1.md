# Recuperación MVP funcional de producto v1

Fecha: 2026-06-27
Rama: `feat/product-working-mvp-recovery`
Objetivo: volver a un flujo práctico de clientes, presupuestos, facturas, PDF, QR y guardado local.

## 1. Qué funciona ahora

- La app arranca en local con `npm run dev`.
- Clientes:
  - crear cliente desde `/clientes`;
  - editar cliente;
  - listar clientes;
  - crear factura o presupuesto desde la ficha del cliente;
  - preseleccionar cliente en documentos con `?cliente=...`.
- Presupuestos:
  - crear presupuesto;
  - añadir líneas;
  - calcular base, IVA y total;
  - guardar;
  - ver en listado;
  - convertir a factura en borrador desde sus acciones;
  - descargar PDF;
  - compartir por email o WhatsApp si el cliente tiene contacto.
- Facturas:
  - crear factura en borrador;
  - añadir líneas;
  - calcular base, IVA y total;
  - guardar;
  - ver en listado;
  - emitir desde edición cambiando estado a enviado;
  - bloquear documento emitido;
  - mostrar acciones de PDF, email, WhatsApp, cobro, recordatorio y rectificativa.
- PDF:
  - descarga desde listado;
  - descarga al guardar y descargar;
  - vista previa PDF existente;
  - PDF usa snapshot cuando el documento está emitido.
- QR:
  - la implementación existente se conserva;
  - aparece en facturas emitidas con perfil emisor válido;
  - se guarda en `doc.verifactu.qrUrl`;
  - el listado muestra la etiqueta `Veri*Factu`;
  - el texto del PDF queda prudente en entorno de pruebas.
- Guardado local:
  - los datos se conservan en `localStorage`;
  - recargar la página mantiene cliente, presupuesto y factura.

## 2. Qué está roto

- La descarga nativa por `blob:` no siempre emite evento observable en Playwright, aunque sí ejecuta el clic de descarga.

## 3. Qué estaba oculto o desconectado

- El flujo de emisión desde el formulario estaba bloqueado por la capa de integridad:
  - cambiar una factura de borrador a enviada intentaba hacerse como edición genérica;
  - la protección lo rechazaba correctamente;
  - el resultado práctico era que el usuario no podía emitir desde ese formulario.
- La creación de documentos dependía de devolver un documento creado dentro del cambio de estado de React:
  - en desarrollo podía quedar como `undefined`;
  - el presupuesto se guardaba en storage, pero la pantalla fallaba antes de cerrar el flujo.
- Faltaba un botón explícito de imprimir en las acciones de documento.
- La conversión presupuesto -> factura estaba mencionada en ayudas, pero no estaba conectada.

## 4. Qué se ha arreglado en esta rama

- Creación de documentos:
  - el documento nuevo se construye antes de actualizar el estado;
  - el formulario recibe un documento real con número, id y fechas.
- Emisión de borradores:
  - si un borrador pasa a estado emitido, se usa el flujo de integridad existente;
  - se generan snapshots;
  - se bloquea el documento emitido;
  - se mantiene el registro QR local/de pruebas cuando corresponde.
- Guardar y descargar PDF:
  - ahora prepara la descarga antes de redirigir al listado;
  - evita perder el disparo de descarga durante la navegación.
- Acciones de documento:
  - se añade botón `Imprimir` con `window.print()`;
  - se mantiene PDF, email y WhatsApp.
- QR/copy:
  - no se sustituye el QR;
  - no se crea QR oficial nuevo;
  - el texto en PDF y previsualización de plantilla pasa a modo prudente.
- Conversión presupuesto -> factura:
  - se añade acción `Convertir a factura` en presupuestos;
  - crea una factura nueva en borrador;
  - abre la factura creada para revisarla antes de emitir.

## Conversión presupuesto -> factura

- El flujo se lanza desde las acciones de un presupuesto existente.
- La factura resultante copia cliente, ficha vinculada, líneas, notas y forma de pago.
- La factura obtiene id nuevo y numeración propia de factura.
- La factura queda siempre en `borrador`.
- Los totales se recalculan desde las líneas copiadas.
- La factura guarda referencia al presupuesto origen.
- El presupuesto original no se muta.
- No se copian `documentSnapshot`, `pdfSnapshot`, hashes ni bloqueo de integridad.
- No se copia `verifactu`, QR, CSV ni estado de emisión.
- No hay AEAT real, XML, firma, certificado ni transporte.
- No se crea QR oficial nuevo.
- Si después se emite la factura, se usa el flujo existente y se conserva el comportamiento QR ya implementado.

## Smoke MVP PDF / impresión / conversión

- Flujo probado con datos sintéticos:
  - cliente con email y teléfono;
  - presupuesto con línea e IVA;
  - conversión a factura;
  - factura en borrador;
  - emisión posterior;
  - PDF generado;
  - QR existente en entorno de pruebas;
  - persistencia local tras recarga.
- La descarga PDF queda cubierta en dos puntos:
  - desde acciones del listado;
  - desde el flujo de guardar y descargar.
- El botón `Imprimir vista` imprime la vista actual del navegador.
- Para imprimir el PDF exacto, el usuario debe abrir o descargar el PDF y usar el visor del navegador/sistema.
- Email y WhatsApp siguen visibles cuando el cliente tiene datos de contacto.
- El presupuesto original no se modifica durante la conversión.
- La factura convertida no nace emitida y no nace con QR.
- El QR aparece solo después de emitir una factura que lo requiere.
- No hay AEAT real.
- No hay XML.
- No hay firma, certificados ni transporte.
- No se crea QR oficial nuevo sin validación.

## PDF, vista previa e impresión

- `Abrir PDF` genera el PDF existente y lo abre en una pestaña nueva cuando el navegador lo permite.
- Desde el visor del navegador el usuario puede revisar el documento e imprimir el PDF exacto.
- Si el navegador bloquea la pestaña, se muestra un aviso y queda disponible la descarga.
- `PDF` descarga el archivo generado con el motor actual.
- `Guardar y descargar PDF` conserva el flujo de guardado y descarga del formulario.
- `Imprimir vista` imprime la pantalla actual de la app, no un render PDF controlado.
- Para imprimir el PDF exacto:
  - abrir PDF y usar el visor del navegador;
  - o descargar PDF y abrirlo en el visor del sistema/navegador.
- Email y WhatsApp se mantienen como acciones separadas cuando el cliente tiene contacto.
- El QR existente se conserva donde ya aparecía.
- No se crea QR oficial nuevo.
- No hay AEAT real.
- No hay XML.
- No hay firma, certificado ni transporte.

## Pulido de uso diario MVP

- Pantalla inicial revisada:
  - accesos para crear cliente, presupuesto y factura;
  - enlaces para revisar clientes, presupuestos y facturas;
  - contadores básicos de clientes, presupuestos, facturas, emitidas y borradores;
  - últimos documentos con acceso al detalle.
- Listados revisados:
  - clientes guía a `Crear cliente` cuando está vacío;
  - presupuestos guía a `Crear presupuesto` cuando está vacío;
  - facturas guía a `Crear factura` cuando está vacío.
- Acciones por tipo de documento:
  - presupuestos mantienen editar/ver, PDF, abrir PDF, imprimir vista, email/WhatsApp y convertir a factura;
  - facturas mantienen editar/ver, PDF, abrir PDF, imprimir vista, email/WhatsApp y acciones ya existentes de cobro, recordatorio y rectificativa.
- El QR existente se conserva sin crear QR oficial nuevo.
- No hay AEAT real, XML, firma, certificado ni transporte.
- Queda para después una revisión visual más amplia y posibles accesos rápidos configurables.

## Pulido formulario y totales

- Revisado el formulario real de presupuestos/facturas:
  - cliente;
  - fechas y estado;
  - líneas;
  - totales;
  - vista previa PDF;
  - guardar y descargar PDF.
- Corregido el flujo de líneas:
  - una línea vacía no rompe totales;
  - valores no finitos se tratan como cero en el formulario;
  - se evita guardar líneas sin concepto;
  - eliminar una línea recalcula el total visible.
- Totales visibles revisados:
  - cantidad decimal;
  - precio decimal;
  - IVA 0;
  - IVA 21;
  - redondeo a dos decimales.
- Para probar:
  - crear cliente;
  - crear presupuesto con una línea de 100 euros;
  - comprobar total 121,00 euros;
  - guardar, descargar PDF y convertir a factura;
  - editar la factura en borrador y emitirla desde el estado.
- Limitaciones:
  - no hay AEAT real;
  - no hay XML;
  - no hay QR oficial nuevo;
  - no hay firma, certificado ni transporte.

## 5. Qué se deja para después

- Vista de impresión dedicada si se quiere imprimir el PDF exacto, no solo la vista actual.
- Tests E2E permanentes para clientes, presupuesto, factura emitida, PDF y QR.
- Revisión visual amplia en navegador real con datos representativos.
- Mejorar mensajes de ayuda que prometen conversión si todavía no existe.

## 6. Cómo probar manualmente el flujo básico

1. Arrancar local con `npm run dev`.
2. Ir a `/clientes`.
3. Crear un cliente con nombre, apellidos, NIF, email y teléfono.
4. Editar el cliente y guardar cambios.
5. Desde la ficha del cliente, crear un presupuesto.
6. Añadir una línea de 100 euros sin IVA.
7. Comprobar total 121,00 euros.
8. Guardar y descargar PDF.
9. Confirmar que vuelve a `/presupuestos` y aparece `P-...`.
10. Ver que existen acciones de PDF, imprimir, email y WhatsApp.
11. Pulsar `Convertir a factura` en el presupuesto.
12. Confirmar que se abre una factura nueva en borrador.
13. Guardar o emitir la factura con el flujo existente.
14. Confirmar que vuelve a `/facturas`, aparece `Emitido` y `Veri*Factu` si procede.
15. Descargar PDF desde el listado.
16. Recargar la página y comprobar que los datos siguen.

## 7. Riesgos reales

- El almacenamiento local sigue siendo el punto único de persistencia para este flujo.
- El botón imprimir imprime la vista actual del navegador, no un render PDF controlado.
- El QR actual está en entorno de pruebas/local si no hay configuración real validada.
- Las facturas emitidas quedan bloqueadas; cualquier cambio posterior debe ir por rectificativa o flujo específico.
