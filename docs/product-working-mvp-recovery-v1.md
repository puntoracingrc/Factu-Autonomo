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

## Estados y seguimiento de presupuestos

- Estados visibles revisados para uso diario:
  - borrador: presupuesto editable antes de preparar el envío;
  - enviado: presupuesto emitido y listo para compartir;
  - aceptado: aceptación registrada localmente por el usuario;
  - rechazado: rechazo registrado localmente por el usuario;
  - convertido: existe una factura creada desde ese presupuesto.
- Aceptar un presupuesto no crea firma ni portal de cliente.
- Rechazar un presupuesto no borra el presupuesto original.
- Aceptar o rechazar solo cambia el seguimiento comercial local.
- El usuario puede desmarcar aceptación o rechazo y volver a enviado.
- Email y WhatsApp siguen siendo acciones de preparación manual.
- La app no envía presupuestos automáticamente.
- PDF, abrir PDF e imprimir vista se mantienen como acciones separadas.
- Convertir a factura crea una factura en borrador para revisión.
- Si el presupuesto ya tiene factura vinculada, la acción abre la factura existente.
- No se crean facturas duplicadas al pulsar de nuevo sobre el mismo presupuesto.
- La lista muestra cuándo un presupuesto ya está convertido.
- La factura convertida conserva referencia al número de presupuesto origen.
- El presupuesto original conserva sus líneas, cliente, PDF y estado propio.
- Un presupuesto rechazado no ofrece conversión mientras siga rechazado.
- Si se desmarca el rechazo, puede retomarse el flujo normal.
- No se añaden envíos reales, firmas, pasarelas ni aceptación online.
- No hay AEAT real, XML, QR oficial nuevo, certificado ni transporte.
- Este pulido se limita a producto local y seguimiento comercial visible.

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

## Copia de seguridad local

- En `/configuracion`, dentro de la tarjeta de datos, aparece el bloque `Copia de seguridad`.
- El botón visible es `Exportar copia de seguridad`.
- La acción descarga un JSON local con metadata de exportación y los datos actuales de la app.
- El archivo usa el nombre `factu-autonomo-backup-YYYY-MM-DD.json`.
- La metadata identifica la app, la versión de exportación, la fecha, el origen local y una advertencia.
- La copia incluye clientes, documentos, gastos, proveedores, recordatorios y configuración del perfil guardados en el navegador.
- La descarga se genera con `Blob` y el mecanismo nativo del navegador.
- Si el navegador no permite iniciar la descarga, la tarjeta muestra un aviso y la app no se rompe.
- La copia puede contener datos personales o fiscales del usuario y de sus clientes.
- El usuario debe guardarla en un lugar seguro.
- Esta copia no se sube a ningún servidor.
- La exportación no escribe en `localStorage`.
- La importación y restauración se gestionan en los bloques siguientes con
  revisión previa.
- La exportación no lee archivos JSON del usuario.
- No se usa `FileReader` para exportar la copia.
- No se cambia la sincronización en nube ni Supabase.
- No toca AEAT real, XML, firma, certificado ni transporte.
- No cambia PDF, QR existente, conversión, emisión ni cobro local.

## Vista previa de copia de seguridad

- En `/configuracion`, junto a la copia local, aparece `Importar copia de seguridad`.
- El usuario puede seleccionar un archivo JSON desde su dispositivo.
- El botón `Revisar copia` lee el archivo seleccionado y genera solo una vista previa.
- La vista previa exige metadata y datos con forma esperada.
- Se aceptan archivos `.json` con tipo `application/json` o tipo vacío controlado.
- Se rechazan extensiones como zip, pdf, xml, html, js o csv.
- Se rechazan nombres sospechosos, JSON inválido, copias sin metadata y formatos desconocidos.
- Se bloquean campos peligrosos como `__proto__`, `constructor` o `prototype`.
- Se bloquean campos que parezcan secretos, tokens, claves o datos de entorno.
- El resumen muestra fecha, versión, origen, clientes, documentos, presupuestos y facturas.
- También muestra facturas emitidas, facturas cobradas y si incluye perfil emisor.
- No muestra clientes completos, documentos completos, PDF, QR ni payload interno.
- La vista previa avisa de que una futura restauración reemplazaría datos locales.
- La vista previa recomienda hacer copia antes de restaurar.
- No se aplica ningún cambio todavía.
- No se escribe en `localStorage`.
- No se sube ningún archivo a servidor.
- La vista previa por sí sola no aplica datos.
- No toca Supabase, AEAT real, XML, firma, certificado ni transporte.

## Restaurar copia de seguridad

- La restauración se inicia desde el mismo bloque de `/configuracion`.
- Primero hay que seleccionar un JSON y generar una vista previa válida.
- La app no permite restaurar una copia que no pase la validación previa.
- Antes de aplicar nada, el usuario debe descargar una copia actual.
- Si la descarga de la copia actual falla, la restauración queda bloqueada.
- La copia actual se descarga en el navegador y no se sube a ningún servidor.
- El usuario debe marcar que entiende que se reemplazarán los datos locales.
- El usuario debe marcar que ha descargado una copia de seguridad actual.
- Solo entonces se habilita el botón `Restaurar copia`.
- Restaurar reemplaza los datos locales de este navegador por los datos del JSON validado.
- La restauración usa el store de la app y el guardado local existente.
- No aplica datos desde un JSON desconocido, sin metadata o con campos peligrosos.
- No aplica copias con claves que parezcan secretos, tokens o variables de entorno.
- Después de restaurar se muestra un mensaje de éxito.
- Si la app necesita refrescar vistas, el usuario puede recargar el navegador.
- No es sincronización cloud.
- No toca Supabase remoto ni producción.
- No toca AEAT real, XML, QR oficial nuevo, firma, certificado ni transporte.
- No cambia PDF, QR existente, conversión, emisión ni cobro local.

## Gastos y proveedores

- `/proveedores` permite crear proveedores desde la lista principal.
- La ficha de proveedor se puede editar sin duplicar la lista.
- Cambiar el nombre de un proveedor actualiza los gastos vinculados por id.
- El listado conserva nombre, NIF si existe, contacto, dirección y compras.
- La búsqueda y ordenación de proveedores siguen funcionando sobre datos locales.
- Los posibles duplicados se pueden unificar con el flujo existente.
- `/gastos/nuevo` mantiene la creación de gastos del negocio.
- El mismo formulario permite editar un gasto existente desde el listado.
- La edición se abre con el enlace contextual del gasto, sin crear una ruta nueva.
- El usuario puede cambiar fecha, descripción, proveedor, base, IVA, categoría y pago.
- Si no se conoce el proveedor, el gasto puede guardarse como `Sin proveedor`.
- Si se informa proveedor y se marca guardar, se reutiliza o crea ficha local.
- Los importes se tratan como base imponible para el gasto.
- La pantalla muestra base, IVA soportado y total antes de guardar.
- Un gasto de base 100 con IVA 21 muestra total 121.
- Un gasto con IVA 0 mantiene total igual a la base.
- Los importes no finitos se normalizan para evitar `NaN` en la interfaz.
- El listado de gastos muestra proveedor, descripción, categoría, forma de pago y total.
- El total del listado respeta el perfil exento de IVA ya existente.
- El CSV de gastos se mantiene en el flujo actual.
- La copia de seguridad incluye gastos y proveedores.
- La vista previa de importación cuenta gastos y proveedores por separado.
- La restauración preserva gastos con y sin proveedor vinculado.
- No se añade contabilidad oficial, presentación de impuestos ni conexión bancaria.
- No toca Supabase remoto ni producción.
- No toca AEAT real, XML, QR oficial nuevo, firma, certificado ni transporte.

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

## Pulido de clientes y contacto

- Revisado el flujo real de clientes:
  - crear cliente desde `/clientes`;
  - editar cliente existente;
  - buscar cliente en el listado;
  - crear presupuesto desde la ficha;
  - crear factura desde la ficha.
- Validaciones ajustadas:
  - nombre y apellidos obligatorios para guardar;
  - NIF opcional;
  - NIF duplicado bloqueado solo dentro de la lista local;
  - email con formato básico si está informado;
  - teléfono limpiado de espacios repetidos sin validación fiscal.
- Ficha de cliente:
  - muestra NIF si existe;
  - muestra email y teléfono como datos de contacto;
  - indica cuándo no hay contacto de envío;
  - mantiene acciones rápidas de factura, presupuesto y edición.
- Documentos:
  - `/facturas/nuevo?cliente=...` preselecciona cliente;
  - `/presupuestos/nuevo?cliente=...` preselecciona cliente;
  - email activa la acción de email en documentos guardados;
  - teléfono compatible activa WhatsApp;
  - documentos emitidos conservan snapshot y no se actualizan retroactivamente.
- Importante:
  - el NIF no se contrasta con servicios oficiales;
  - no se verifica el cliente ante AEAT;
  - no hay AEAT real, XML, firma, certificado ni transporte.

## Perfil emisor y datos del negocio

- Los datos del negocio se revisan en `/configuracion`.
- El bloque principal cubre:
  - nombre fiscal o razón social;
  - NIF/CIF;
  - dirección fiscal;
  - código postal;
  - ciudad;
  - email;
  - teléfono;
  - IBAN;
  - logo para PDF.
- La pantalla muestra si faltan datos para documentos completos.
- Email y teléfono tienen validación básica si se informan.
- El NIF/CIF se normaliza al guardar, pero no se valida con AEAT.
- Presupuestos y facturas en borrador usan el perfil emisor actual.
- El PDF muestra esos datos como emisor del documento.
- Si faltan datos importantes en un PDF vivo, se muestra un aviso prudente.
- Al emitir una factura, el emisor queda congelado en snapshot.
- Cambiar `/configuracion` después no cambia facturas emitidas.
- Nuevos documentos sí usan los datos actualizados.
- El QR existente sigue dependiendo de las condiciones actuales de la app.
- Si falta NIF/CIF, la app avisa de que puede faltar dato para QR.
- No se crea QR oficial nuevo.
- No hay validación real de NIF con AEAT.
- No hay AEAT real.
- No hay XML.
- No hay certificado, firma ni transporte.

## Estados de factura, cobro y recordatorios

- Estados visibles revisados:
  - borrador: editable hasta emitir;
  - emitida/enviada: factura protegida, con PDF y QR existentes;
  - cobrada: registro local de cobro;
  - vencida: factura pendiente que puede necesitar recordatorio;
  - rectificada/anulada: original bloqueada con rectificativa asociada.
- Acciones operativas:
  - abrir PDF;
  - descargar PDF;
  - imprimir vista;
  - compartir por email o WhatsApp si el cliente tiene contacto;
  - preparar recordatorio de pago;
  - marcar factura emitida como cobrada;
  - crear recibo vinculado al marcar una factura como cobrada;
  - crear rectificativa desde facturas emitidas cuando procede.
- Cobro:
  - marcar como cobrada solo registra el estado en la app;
  - no conecta bancos;
  - no ejecuta pagos;
  - no es una pasarela.
- Recordatorios:
  - preparan el mensaje para email o WhatsApp;
  - el usuario puede revisar el texto antes de enviarlo;
  - si no hay contacto, la acción no se ofrece.
- Protección:
  - la factura emitida sigue bloqueada;
  - el PDF sigue usando snapshot;
  - el QR existente se mantiene.
- Pendiente:
  - no hay cobro bancario real;
  - no hay conciliación;
  - no hay AEAT real;
  - no hay XML;
  - no hay firma, certificado ni transporte.

## Revisión visual MVP

- Pantallas revisadas en navegador local:
  - Inicio;
  - Clientes;
  - Presupuestos;
  - Facturas;
  - Configuración;
  - formulario de factura;
  - detalle de factura emitida;
  - detalle de presupuesto convertido.
- Datos usados:
  - perfil emisor sintético completo;
  - cliente con email y teléfono;
  - cliente sin contacto;
  - presupuesto borrador;
  - presupuesto rechazado;
  - presupuesto convertido;
  - factura borrador;
  - factura emitida;
  - factura cobrada localmente.
- Resultado móvil:
  - sin overflow horizontal en viewport de 390 px;
  - acciones compactas desplazables cuando procede;
  - menú inferior conserva desplazamiento horizontal.
- Cambios visibles principales:
  - foco visible en botones, enlaces y acciones compactas;
  - aviso visible cuando un documento no tiene email ni teléfono;
  - presupuesto convertido muestra enlace claro a su factura;
  - Ajustes evita texto temporal de carga de invitaciones.
- Pendiente:
  - capturas E2E permanentes si se quiere automatizar la revisión visual.

## 5. Qué se deja para después

- Vista de impresión dedicada si se quiere imprimir el PDF exacto, no solo la vista actual.
- Tests E2E permanentes para clientes, presupuesto, factura emitida, PDF y QR.
- Mejorar mensajes de ayuda específicos si aparecen nuevos casos de conversión.

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
