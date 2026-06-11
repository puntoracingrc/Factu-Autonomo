import type { ManualSection } from "../types";

export const clientesSection: ManualSection = {
  slug: "clientes",
  title: "Clientes",
  summary: "Guarda los datos de quien te paga para reutilizarlos en facturas.",
  order: 3,
  steps: [
    {
      title: "1. Añadir un cliente",
      paragraphs: [
        "En **Clientes** pulsa **+ Añadir cliente** e introduce nombre, NIF, email y teléfono.",
        "Email y teléfono son importantes: los usarás para enviar facturas y recordatorios de pago.",
      ],
      screenshot: {
        src: "/ayuda/capturas/clientes-nuevo.png",
        alt: "Formulario de nuevo cliente",
      },
    },
    {
      title: "2. Usar un cliente en una factura",
      paragraphs: [
        "Al crear una factura o presupuesto, busca el cliente por nombre. Sus datos se rellenan solos.",
        "Si editas un cliente después, las facturas ya emitidas **no cambian** (conservan los datos del momento de emisión).",
      ],
      screenshot: {
        src: "/ayuda/capturas/clientes-seleccion.png",
        alt: "Selección de cliente al crear documento",
      },
    },
  ],
};
