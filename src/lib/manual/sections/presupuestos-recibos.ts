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
        "Si necesitas relacionar documentos manualmente, usa **Vincular** en el listado o en la vista del documento. Al elegir un documento, el buscador se pliega y queda la selección preparada para confirmar. Cuando ya existe vínculo, el botón pasa a **Desvincular** y lo quita directamente sin cambiar el PDF ya emitido.",
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
  summary: "Justificantes de cobro, a veces creados automáticamente.",
  order: 7,
  steps: [
    {
      title: "1. Recibo al cobrar una factura",
      paragraphs: [
        "Al marcar una factura como **Cobrada**, la app puede generar un **recibo** vinculado con el mismo importe.",
        "Verás el recibo vinculado en el listado de facturas con una pastilla de cadena. También puedes usar **Vincular** para enlazar manualmente una factura y un recibo; si ya están enlazados, el botón cambia a **Desvincular**.",
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
  ],
};
