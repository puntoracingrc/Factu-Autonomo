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

- No se ha encontrado conversión real de presupuesto a factura en la UI actual.
- El botón de conversión se menciona en textos de ayuda, pero no aparece como flujo conectado.
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

## 5. Qué se deja para después

- Conversión presupuesto -> factura con decisión de producto clara.
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
11. Crear una factura para el mismo cliente.
12. Añadir una línea de 100 euros sin IVA.
13. Guardar factura en borrador.
14. Editarla, cambiar estado a enviado y guardar.
15. Confirmar que vuelve a `/facturas`, aparece `Emitido` y `Veri*Factu`.
16. Descargar PDF desde el listado.
17. Recargar la página y comprobar que los datos siguen.

## 7. Riesgos reales

- El almacenamiento local sigue siendo el punto único de persistencia para este flujo.
- La conversión de presupuesto a factura no debe venderse como disponible hasta implementarla.
- El botón imprimir imprime la vista actual del navegador, no un render PDF controlado.
- El QR actual está en entorno de pruebas/local si no hay configuración real validada.
- Las facturas emitidas quedan bloqueadas; cualquier cambio posterior debe ir por rectificativa o flujo específico.
