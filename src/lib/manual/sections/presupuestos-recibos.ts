import type { ManualSection } from "../types";

export const presupuestosSection: ManualSection = {
  slug: "presupuestos",
  title: "Presupuestos",
  summary: "Envía propuestas, controla su validez y conviértelas en factura.",
  order: 6,
  steps: [
    {
      title: "1. Crear y enviar un presupuesto",
      paragraphs: [
        "Funciona como una factura orientada a propuesta: creas líneas, generas PDF y lo envías por email o WhatsApp.",
        "Puedes elegir un cliente existente o rellenar sus datos dentro del presupuesto. Si el cliente no existe, se crea su ficha al guardar.",
        "El IVA se elige una vez para todo el presupuesto, no en cada línea.",
        "En las líneas puedes buscar productos detectados en compras. Si hay PVP, se inserta como precio de venta; si la app solo conoce el coste, aparece un aviso para que ajustes el precio antes de enviar.",
        "La fecha de validez se calcula con los días configurados en **Ajustes → Facturación**. En el formulario verás **Válido hasta**.",
        "En el listado, el icono del **ojo** abre la vista previa del PDF dentro de la app y el botón de descarga guarda el PDF.",
        "En **Datos del cliente** también puedes usar **Rellenar con IA** (plan Pro) para pegar datos recibidos por WhatsApp, email o web. Si el cliente no existe, se crea su ficha al guardar el presupuesto.",
      ],
      screenshot: {
        src: "/ayuda/capturas/presupuestos-nuevo.png",
        alt: "Crear nuevo presupuesto",
      },
    },
    {
      title: "2. Marcar como aceptado",
      paragraphs: [
        "Cuando el cliente confirme, pulsa **Aceptado** en el listado. Así tendrás una referencia visual clara.",
        "Los presupuestos también pueden aparecer como **Caducado** si vence su validez, o **Convertido a factura** cuando ya se creó la factura desde ese presupuesto.",
      ],
      screenshot: {
        src: "/ayuda/capturas/presupuestos-aceptado.png",
        alt: "Marcar presupuesto como aceptado",
      },
    },
    {
      title: "3. Convertir a factura editable",
      paragraphs: [
        "Pulsa **Convertir** para crear una factura en **borrador** desde el presupuesto.",
        "La factura creada conserva cliente, conceptos y vínculo con el presupuesto, pero sigue siendo editable antes de emitirla. Esto permite ajustar extras o cambios acordados con el cliente.",
        "Después de convertir, el presupuesto mostrará el vínculo con la factura. En los listados verás una pastilla con icono de cadena para abrir el documento relacionado.",
        "También puedes vincular un presupuesto existente desde la tarjeta de su factura. La cadena visual permite abrir ambos documentos y la **X** quita solo la relación, sin cambiar los PDF emitidos.",
      ],
    },
    {
      title: "4. Buscar en listados largos",
      paragraphs: [
        "Presupuestos se ordena de más nuevo a más antiguo, muestra separadores por mes y carga 30 resultados cada vez.",
        "Usa filtros por periodo y estado para encontrar borradores, enviados, aceptados, caducados o convertidos.",
        "Si has vinculado compras a un presupuesto desde **Gastos**, verás **Costes vinculados** y **Margen estimado** en el listado. Sirve para comparar rápido el coste real asociado al trabajo con lo presupuestado.",
      ],
    },
  ],
};

export const recibosSection: ManualSection = {
  slug: "recibos",
  title: "Recibos",
  summary: "Justificantes de cobro creados cuando el cliente los necesita.",
  order: 7,
  steps: [
    {
      title: "1. Crear un recibo desde una factura",
      paragraphs: [
        "Marcar una factura como **Cobrada** no genera un recibo automáticamente.",
        "Si el cliente lo solicita, usa el botón **Recibo** de la factura cobrada. La app lo crea con el mismo importe y conserva el vínculo con su factura de origen.",
        "Si ya hay un recibo, el acceso pasa a **Ver recibo** y abre el existente: nunca crea un duplicado. Si la factura no es elegible o el vínculo no es inequívoco, verás el motivo y no se guardará ningún cambio parcial.",
        "El recibo aparece automáticamente en la cadena visual de la factura. Ese vínculo no se crea, reasigna ni rompe manualmente desde el panel de vínculos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/recibos-automatico.png",
        alt: "Recibo generado al cobrar factura",
      },
    },
    {
      title: "2. Crear un recibo manual",
      paragraphs: [
        "También puedes ir a **Recibos** → **Nuevo recibo** si necesitas un justificante independiente.",
        "Igual que en facturas y presupuestos, puedes escribir los datos de un cliente nuevo en el propio recibo y la ficha se guardará al guardar el documento.",
        "El IVA se elige una vez para todo el recibo, igual que en facturas y presupuestos.",
        "Si escribes un producto o servicio usado antes, la app puede sugerirlo en la línea. Revisa el aviso si no existe PVP y solo se ha rellenado el coste conocido.",
        "En el listado, el icono del **ojo** abre la vista previa del PDF dentro de la app y el botón **PDF** lo descarga.",
        "Como en facturas y presupuestos, el bloque **Rellenar con IA** puede ayudarte a completar los datos del cliente antes de guardar.",
        "El listado de recibos también está ordenado de más nuevo a más antiguo, con separadores por mes y botón **Cargar más** si hay muchos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/recibos-nuevo.png",
        alt: "Crear recibo manualmente",
      },
    },
    {
      title: "3. Recibos con integridad bloqueada",
      paragraphs: [
        "Un recibo con **Integridad bloqueada** no está simplemente en modo de solo lectura. La app ha detectado que falta o no coincide una evidencia protegida, por ejemplo el snapshot, el PDF, el sello o el origen fiscal congelado del recibo.",
        "Por seguridad se muestra **0,00 €** y se impiden acciones que utilizarían un importe no verificable. Conserva el PDF y la copia de seguridad: cualquier recuperación debe revisarse y registrarse de forma explícita, sin resellar automáticamente un documento ya emitido.",
      ],
    },
  ],
};
