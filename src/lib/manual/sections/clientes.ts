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
        "Para la dirección, elige el **tipo de vía** (Calle, Avenida, etc.) y escribe solo el **nombre de la calle y el número** — sin C/, Avda. ni otros prefijos. Así el listado puede ordenarse bien por calle.",
        "El **NIF no puede repetirse** en otro cliente. Si ya existe, verás un aviso y podrás **unificar** registros duplicados.",
        "Email y teléfono son importantes: los usarás para enviar facturas y recordatorios de pago.",
      ],
      screenshot: {
        src: "/ayuda/capturas/clientes-nuevo.png",
        alt: "Formulario de nuevo cliente",
      },
    },
    {
      title: "2. Rellenar con IA desde un texto",
      paragraphs: [
        "Si tienes plan **Pro**, puedes pegar un texto recibido por WhatsApp, email o web en **Rellenar con IA** dentro del formulario de cliente.",
        "La app intenta separar razón social o nombre, NIF/CIF, teléfono, email, tipo de vía, dirección, código postal y ciudad. Si falta el código postal pero hay dirección y ciudad, puede intentar localizarlo automáticamente. Después debes **revisar los campos antes de guardar**, porque los textos escritos a mano pueden venir incompletos o mal ordenados.",
        "Cada relleno consume **1 unidad IA**. Como referencia, **10 rellenos de cliente equivalen a 1 escaneo** de factura o ticket.",
        "También encontrarás este bloque al crear una **factura**, **presupuesto** o **recibo**: si el cliente no existe, se guardará automáticamente al guardar el documento.",
        "En el plan **Gratis** puedes seguir creando y editando clientes manualmente.",
      ],
    },
    {
      title: "3. Buscar y facturar rápido",
      paragraphs: [
        "Usa el **buscador** para localizar un cliente por nombre o NIF. Al elegirlo, verás solo su ficha en el listado.",
        "En cada cliente puedes pulsar el icono de **factura** o **presupuesto** para crear el documento con sus datos ya rellenados.",
      ],
    },
    {
      title: "4. Usar un cliente en una factura",
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
