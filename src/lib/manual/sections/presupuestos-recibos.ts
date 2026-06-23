import type { ManualSection } from "../types";

export const presupuestosSection: ManualSection = {
  slug: "presupuestos",
  title: "Presupuestos",
  summary: "Envía propuestas y márcalas como aceptadas.",
  order: 5,
  steps: [
    {
      title: "1. Crear y enviar un presupuesto",
      paragraphs: [
        "Funciona como una factura en borrador orientada a propuestas: creas líneas, generas PDF y lo envías por email o WhatsApp.",
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
        "Cuando el cliente confirme, pulsa **Aceptado** en el listado. Así distinguirás presupuestos cerrados de los pendientes.",
      ],
      screenshot: {
        src: "/ayuda/capturas/presupuestos-aceptado.png",
        alt: "Marcar presupuesto como aceptado",
      },
    },
  ],
};

export const recibosSection: ManualSection = {
  slug: "recibos",
  title: "Recibos",
  summary: "Justificantes de cobro, a veces creados automáticamente.",
  order: 6,
  steps: [
    {
      title: "1. Recibo al cobrar una factura",
      paragraphs: [
        "Al marcar una factura como **Cobrada**, la app puede generar un **recibo** vinculado con el mismo importe.",
        "Verás el número del recibo en el listado de facturas.",
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
        "Como en facturas y presupuestos, el bloque **Rellenar con IA** puede ayudarte a completar los datos del cliente antes de guardar.",
      ],
      screenshot: {
        src: "/ayuda/capturas/recibos-nuevo.png",
        alt: "Crear recibo manualmente",
      },
    },
  ],
};
