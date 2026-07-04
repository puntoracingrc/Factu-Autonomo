import type { ManualSection } from "../types";

export const facturasSection: ManualSection = {
  slug: "facturas",
  title: "Facturas",
  summary: "Crear, enviar, cobrar y recordar el pago de tus facturas.",
  order: 4,
  intro: [
    "Las facturas son el núcleo de la app. Puedes crearlas en borrador, emitirlas en PDF, enviarlas al cliente y marcarlas como cobradas.",
  ],
  steps: [
    {
      title: "1. Crear una factura nueva",
      paragraphs: [
        "Ve a **Facturas** → **Nueva factura** (o usa el acceso rápido en Panel).",
        "Elige o crea un **cliente**, añade líneas con concepto, cantidad, unidad y precio con o sin IVA. El IVA se elige una vez para todo el documento. En escritorio las líneas se muestran compactas; en móvil se apilan para poder rellenarlas sin pelearte con la pantalla.",
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
        "Si Veri*Factu está activado, el QR tributario y la huella se generan al emitir, no mientras la factura sigue en borrador.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-pdf.png",
        alt: "Botón de descarga PDF en el listado de facturas",
      },
    },
    {
      title: "3. Listado, PDF y búsqueda",
      paragraphs: [
        "El listado de facturas está ordenado de más nueva a más antigua y muestra separadores por mes para orientarte al bajar.",
        "Si hay muchas facturas, verás primero 30 y luego el botón **Cargar más**.",
        "Pulsa el icono del **ojo** para abrir la vista previa del PDF dentro de la app. Es el mismo PDF que se descarga, con botón **Descargar** dentro del visor.",
        "El icono de descarga guarda el PDF directamente. Los iconos muestran qué hacen al pasar el ratón o enfocar con teclado.",
        "Si has vinculado compras a esa factura desde **Gastos**, el listado muestra **Costes vinculados** y **Margen estimado**. Es una ayuda rápida para saber si ese trabajo va bien; no modifica el PDF ni la factura emitida.",
      ],
    },
    {
      title: "4. Enviar al cliente (email o WhatsApp)",
      paragraphs: [
        "Si el cliente tiene **email** o **teléfono** guardado, verás iconos de **Email** y **WhatsApp**.",
        "La app prepara un mensaje con el importe y, si aplica, el IBAN. En muchos móviles puedes compartir el PDF directamente; si no, se descarga para que lo adjuntes tú.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-enviar.png",
        alt: "Botones de envío por email y WhatsApp",
      },
    },
    {
      title: "5. Marcar como cobrada",
      paragraphs: [
        "Pulsa el círculo **Cobrar** cuando el cliente pague. La factura pasará a estado **Cobrado** y, en facturas normales, se crea un **recibo** vinculado.",
        "Los documentos relacionados aparecen como pastillas con icono de cadena. Usa **Vincular** para enlazar manualmente un presupuesto de origen o un recibo asociado; si ya hay vínculo, el botón cambia a **Desvincular** y lo quita directamente sin cambiar el PDF ya emitido.",
        "Si te equivocas, vuelve a pulsar para desmarcar.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-cobrar.png",
        alt: "Botón de marcar factura como cobrada",
      },
    },
    {
      title: "6. Recordar el pago (facturas impagadas)",
      paragraphs: [
        "En facturas **pendientes** con contacto del cliente aparece **Recordar** (icono de campana).",
        "Se abre un cuadro con un **mensaje amable sugerido** que puedes editar antes de enviar.",
        "Puedes enviarlo por **email** (automático si el servidor de correo está configurado) o por **WhatsApp**.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-recordatorio.png",
        alt: "Modal de recordatorio de pago con mensaje editable",
        caption: "Personaliza el tono del recordatorio antes de enviarlo.",
      },
    },
    {
      title: "7. Rectificar una factura",
      paragraphs: [
        "Si necesitas corregir una factura ya emitida, usa **Rectificar** en el listado. Se creará una factura rectificativa vinculada a la original.",
        "Las facturas emitidas no se editan libremente. Si aún es borrador, sí puedes editarla o borrarla antes de emitir.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-rectificar.png",
        alt: "Opción de rectificar factura",
      },
    },
  ],
};
