import type { ManualSection } from "../types";

export const facturasSection: ManualSection = {
  slug: "facturas",
  title: "Facturas",
  summary: "Crear, enviar, cobrar y recordar el pago de tus facturas.",
  order: 5,
  intro: [
    "Las facturas son el núcleo de la app. Puedes crearlas en borrador, emitirlas en PDF, enviarlas al cliente y marcarlas como cobradas.",
  ],
  steps: [
    {
      title: "1. Crear una factura nueva",
      paragraphs: [
        "Ve a **Facturas** → **Nueva factura** (o usa el acceso rápido en Panel).",
        "Puedes elegir un **cliente** ya guardado o escribir sus datos directamente en la factura. Si es nuevo, la app crea la ficha del cliente automáticamente al guardar.",
        "Añade líneas con concepto, cantidad, unidad y precio con o sin IVA. El IVA se elige una vez para todo el documento. En escritorio las líneas se muestran compactas; en móvil se apilan para poder rellenarlas sin pelearte con la pantalla.",
        "Al escribir el concepto, la app puede sugerir productos detectados en tus compras. Si el producto tiene PVP, lo usa como precio de venta; si solo conoce el coste, lo marca con aviso para que revises el precio antes de emitir.",
        "Si tienes plan **Pro**, puedes pegar datos de facturación en **Rellenar con IA** dentro de **Datos del cliente**. La app rellena la ficha y, si es un cliente nuevo, lo guarda automáticamente al guardar la factura.",
        "Puedes poner **fecha de vencimiento**, forma de pago y notas antes de guardar. La **Vista previa borrador** usa el mismo generador de PDF que la descarga, pero sin emitir la factura.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-nueva.png",
        alt: "Formulario de nueva factura",
      },
      tip: "Usa la vista previa antes de emitir para comprobar que todo se ve bien.",
    },
    {
      title: "2. Guardar borrador o emitir",
      paragraphs: [
        "**Guardar borrador** mantiene la factura editable. El borrador no reserva número fiscal, no bloquea el documento y no genera registro Veri*Factu.",
        "**Emitir factura** o **Emitir y descargar PDF** asigna el número definitivo según la numeración actual, guarda la fecha del documento y bloquea la factura.",
        "El registro Veri*Factu y el QR tributario están desactivados. Emitir una factura no la presenta a AEAT ni genera un distintivo de aceptación.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-pdf.png",
        alt: "Botón de descarga PDF en el listado de facturas",
      },
    },
    {
      title: "3. Listado, PDF y búsqueda",
      paragraphs: [
        "El listado mantiene juntos los documentos de cada año y mes. Dentro de cada mes ordena por el último bloque numérico del número de factura, de mayor a menor, sin dar prioridad al texto o al prefijo de la serie. Por ejemplo, el año incluido en un número nuevo identifica su formato, pero no sustituye a la secuencia final.",
        "La fecha evita que una factura antigua aparezca dentro de un periodo moderno. Si dos facturas comparten periodo y secuencia, la fecha exacta y el número completo se usan solo para desempatar. Los prefijos pueden ser cualesquiera y los números que no se puedan interpretar quedan al final de su mes.",
        "Las facturas rectificativas se distinguen con un borde naranja en su tarjeta, además de la etiqueta Rectificativa, para localizarlas rápidamente sin alterar su estado ni sus importes.",
        "El filtro **Estado → Bloqueadas** muestra únicamente las facturas que no superan la comprobación fiscal de integridad. Desde el aviso del Resumen fiscal, **Revisar documentos bloqueados** abre directamente este filtro. Cuando la fecha del documento sigue siendo fiable, el aviso solo lo cuenta en el trimestre, meses o año al que pertenece. Si el problema afecta precisamente al hash, el sello o la relación que permitirían confiar en esa fecha, el bloqueo permanece visible en todos los periodos hasta revisarlo.",
        "Los filtros permiten seleccionar un mes, entre uno y tres meses consecutivos, un trimestre, un año o todo el historial. En **Trimestre** y **Meses**, pulsa **Exportar facturas PDF** para descargar un ZIP con una carpeta que contiene las facturas emitidas del periodo y un PDF **Resumen Facturas** con fecha, número, cliente, NIF, base, IVA, total y totales del periodo.",
        "También puedes buscar un único cliente por su nombre o datos. Cuando la coincidencia es inequívoca, el exportador incluye **todas sus facturas emitidas filtradas** aunque el listado solo enseñe los primeros 30 resultados. Los borradores no entran en el paquete fiscal. Aparece **Exportar y enviar al cliente** si su ficha —o sus facturas antiguas de forma coherente— aporta un único email válido. El envío reutiliza el selector Gmail, correo del dispositivo o Compartir; Compartir adjunta el ZIP y los otros métodos abren el borrador para que lo adjuntes.",
        "Si has completado **Ajustes → Mi gestor**, **Exportar y enviar al gestor** descarga exactamente el mismo ZIP y usa el método de email configurado en **Ajustes → Preferencias**. Con **Preguntar** puedes elegir Gmail, el correo del dispositivo o Compartir y recordar la elección. Gmail y el correo del dispositivo abren un borrador con destinatario, asunto y resumen ya escritos; Factu te recuerda en pantalla que debes adjuntar el ZIP, sin añadir esa instrucción interna al texto destinado al gestor. Compartir incluye el ZIP cuando el dispositivo admite archivos ZIP y, si no, Factu vuelve a ofrecer Gmail o el correo del dispositivo. Las facturas y el resumen del paquete muestran **facturacion-autonomos.app** en el pie de cada página.",
        "Si hay muchas facturas, verás primero 30 y luego el botón **Cargar más**.",
        "Pulsa el icono del **ojo** para abrir la vista previa del PDF dentro de la app. Es el mismo PDF que se descarga, con botón **Descargar** dentro del visor.",
        "El icono de descarga guarda el PDF directamente. Los iconos muestran qué hacen al pasar el ratón o enfocar con teclado.",
        "El listado muestra **Beneficio tras IRPF** y **Reserva impuestos** como referencia rápida. Si has vinculado compras a esa factura desde **Gastos**, el beneficio descuenta esos costes vinculados y la provisión orientativa de IRPF; no modifica el PDF ni la factura emitida. Un coste vinculado no deducible sí reduce el margen real, pero no reduce la base ni el IVA usados para estimar las reservas fiscales. En **Rentabilidad Real** verás esa base estimada para IRPF separada del beneficio económico.",
      ],
    },
    {
      title: "4. Vincular documentos y gastos desde la factura",
      paragraphs: [
        "En el listado de **Facturas**, pulsa el icono de **Vínculos** de una factura. La gestión se abre dentro de su propia tarjeta, sin llevarte a la calculadora de rentabilidad.",
        "La tarjeta actual ya identifica la factura, por eso la cadena no la repite: muestra solo sus documentos relacionados, como la rectificativa, el presupuesto de origen y el recibo, además de los gastos vinculados.",
        "El presupuesto del que procede una factura es una relación histórica de conversión. Si esa procedencia ya está establecida, se conserva en ambos documentos y no se puede cambiar ni quitar con una **X**.",
        "La pestaña **Gastos** permite buscar por factura, producto o proveedor y vincular varios gastos al mismo trabajo. La **X** aparece únicamente en estos gastos operativos y desvinculables: al pulsarla, el gasto sigue intacto en Gastos.",
        "Si una factura de proveedor contiene líneas que no corresponden al trabajo, abre **Elegir líneas**. Las líneas naranjas cuentan en la rentabilidad y las grises quedan fuera de ese cálculo; la factura de proveedor y su tratamiento fiscal no se modifican.",
        "El recibo no se crea ni se reasigna desde este panel. Cuando lo generas con el botón **Recibo** de la factura, aparece automáticamente en la cadena.",
      ],
    },
    {
      title: "5. Enviar al cliente (email o WhatsApp)",
      paragraphs: [
        "Si el cliente tiene **email** o **teléfono** guardado, verás iconos de **Email** y **WhatsApp**.",
        "La app prepara un mensaje con el importe y, si aplica, el IBAN. En muchos móviles puedes compartir el PDF directamente; si no, se descarga para que lo adjuntes tú.",
        "Para enviar emails o recordatorios reales necesitas haber iniciado sesión y confirmado tu email.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-enviar.png",
        alt: "Botones de envío por email y WhatsApp",
      },
    },
    {
      title: "6. Marcar como cobrada",
      paragraphs: [
        "Pulsa el círculo **Cobrar** cuando el cliente pague. La factura pasará a estado **Cobrado**. Esto no genera un recibo por sí solo.",
        "Si el cliente te pide recibo, usa el botón **Recibo** de la factura cobrada para generarlo y dejarlo vinculado. El recibo aparecerá automáticamente en la cadena de documentos de la factura. Si ya existe, el mismo acceso abre ese recibo en vez de crear otro.",
        "Si no se puede generar, la app muestra el motivo: por ejemplo, que la factura todavía no está cobrada, que ya tiene un vínculo incoherente o que su integridad está bloqueada. No se crea ni se guarda un recibo a medias.",
        "Si te equivocas, vuelve a pulsar para desmarcar.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-cobrar.png",
        alt: "Botón de marcar factura como cobrada",
      },
    },
    {
      title: "7. Recordar el pago (facturas impagadas)",
      paragraphs: [
        "En facturas **pendientes** con contacto del cliente aparece **Recordar** (icono de campana).",
        "Se abre un cuadro con un **mensaje amable sugerido** que puedes editar antes de enviar.",
        "Puedes enviarlo por **email** (automático si el servidor de correo está configurado) o por **WhatsApp**.",
        "Si todavía no has confirmado el email de tu cuenta, la app te pedirá hacerlo antes de enviar recordatorios reales.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-recordatorio.png",
        alt: "Modal de recordatorio de pago con mensaje editable",
        caption: "Personaliza el tono del recordatorio antes de enviarlo.",
      },
    },
    {
      title: "8. Rectificar una factura",
      paragraphs: [
        "Si necesitas corregir una factura ya emitida, usa **Rectificar** en el listado. Se creará una factura rectificativa vinculada a la original.",
        "Las facturas emitidas no se editan libremente. Si aún es borrador, sí puedes editarla o borrarla antes de emitir.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-rectificar.png",
        alt: "Opción de rectificar factura",
      },
    },
    {
      title: "9. Qué significa Integridad bloqueada",
      paragraphs: [
        "**Integridad bloqueada** no es el bloqueo normal que impide editar una factura emitida. Significa que falta o no coincide alguna evidencia protegida —como el snapshot fiscal, el PDF conservado, su sello o una relación fiscal congelada— y la app no puede demostrar con seguridad que el contenido sigue siendo el emitido.",
        "Como protección fail-closed, la app muestra **0,00 €** y desactiva cobro, envío, rectificación y otros cálculos o acciones que podrían usar cifras no verificadas. No sustituye el importe histórico del PDF ni significa que la operación valiera cero.",
        "Conserva el PDF original y una copia de seguridad. La recuperación debe ser explícita y auditable, comparando esas evidencias y sin regenerar silenciosamente el snapshot, el sello ni el hash del documento emitido.",
      ],
    },
  ],
};
