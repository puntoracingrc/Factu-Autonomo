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
        "Ve a **Facturas** → **+ Nueva factura** (o usa el acceso rápido en Inicio).",
        "Elige o crea un **cliente**, añade líneas con concepto, cantidad y precio, y revisa el IVA de cada línea.",
        "Puedes poner **fecha de vencimiento**, forma de pago y notas antes de guardar.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-nueva.png",
        alt: "Formulario de nueva factura",
      },
      tip: "Usa **Vista previa PDF** antes de emitir para comprobar que todo se ve bien.",
    },
    {
      title: "2. Emitir y descargar el PDF",
      paragraphs: [
        "Cuando guardas una factura emitida, se genera un **número automático** (por ejemplo F-2026-0001) y ya no puedes editarla libremente: solo verla o rectificarla.",
        "Pulsa **PDF** en el listado para descargar el documento.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-pdf.png",
        alt: "Botón de descarga PDF en el listado de facturas",
      },
    },
    {
      title: "3. Enviar al cliente (email o WhatsApp)",
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
      title: "4. Marcar como cobrada",
      paragraphs: [
        "Pulsa el círculo **Cobrar** cuando el cliente pague. La factura pasará a estado **Cobrado** y, en facturas normales, se crea un **recibo** vinculado.",
        "Si te equivocas, vuelve a pulsar para desmarcar.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-cobrar.png",
        alt: "Botón de marcar factura como cobrada",
      },
    },
    {
      title: "5. Recordar el pago (facturas impagadas)",
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
      title: "6. Rectificar una factura",
      paragraphs: [
        "Si necesitas corregir una factura ya emitida, usa **Rectificar** en el listado. Se creará una factura rectificativa vinculada a la original.",
      ],
      screenshot: {
        src: "/ayuda/capturas/facturas-rectificar.png",
        alt: "Opción de rectificar factura",
      },
    },
  ],
};
