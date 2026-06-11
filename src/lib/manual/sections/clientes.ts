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
        "En **Clientes** pulsa **Nuevo cliente** e introduce nombre, apellidos, NIF, email y teléfono.",
        "El **NIF no puede repetirse** en otro cliente. Si ya existe, verás un aviso y podrás **unificar** registros duplicados.",
        "Email y teléfono son importantes: los usarás para enviar facturas y recordatorios de pago.",
      ],
      screenshot: {
        src: "/ayuda/capturas/clientes-nuevo.png",
        alt: "Formulario de nuevo cliente",
      },
    },
    {
      title: "2. Buscar y facturar rápido",
      paragraphs: [
        "Usa el **buscador** para localizar un cliente por nombre o NIF. Al elegirlo, verás solo su ficha en el listado.",
        "En cada cliente puedes pulsar el icono de **factura** o **presupuesto** para crear el documento con sus datos ya rellenados.",
      ],
    },
    {
      title: "3. Usar un cliente en una factura",
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
