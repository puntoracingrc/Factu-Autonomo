import type { ManualSection } from "../types";

export const clientesSection: ManualSection = {
  slug: "clientes",
  title: "Clientes",
  summary: "Guarda los datos de quien te paga para reutilizarlos en facturas.",
  order: 4,
  steps: [
    {
      title: "1. No siempre tienes que crear el cliente antes",
      paragraphs: [
        "Puedes crear una factura, presupuesto o recibo y escribir los datos del cliente directamente en el documento.",
        "Si ese cliente no existe, la app crea su ficha automáticamente al guardar el documento. Así puedes empezar por la factura y ordenar la ficha después.",
        "Crear el cliente desde **Clientes** sigue siendo útil si quieres tenerlo preparado antes o revisar duplicados con calma.",
      ],
    },
    {
      title: "2. Añadir un cliente manualmente",
      paragraphs: [
        "En **Clientes** pulsa **Nuevo cliente**. Se abrirá una pantalla limpia para introducir nombre, apellidos, NIF, email y teléfono; al guardar o cancelar volverás al listado.",
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
      title: "3. Rellenar desde un texto",
      paragraphs: [
        "Puedes pegar texto recibido por WhatsApp, email o web en **Rellenar desde texto** dentro del formulario de cliente, aunque venga desordenado.",
        "La app intenta separar razón social o nombre, NIF/CIF, teléfono, email, tipo de vía, dirección, código postal y ciudad con reglas locales. Después debes **revisar los campos antes de guardar**, porque los textos escritos a mano pueden venir incompletos o mal ordenados.",
        "Si el texto es ambiguo, puedes usar **Mejorar con IA**. En ese caso verás antes el aviso de tratamiento con IA y el texto solo se enviará al proveedor externo si lo aceptas.",
        "Cada mejora con IA consume **1 unidad IA**. Como referencia, **10 mejoras de cliente equivalen a 1 escaneo** de factura o ticket.",
        "También encontrarás este bloque al crear una **factura**, **presupuesto** o **recibo**: si el cliente no existe, se guardará automáticamente al guardar el documento.",
        "En el plan **Gratis** puedes usar el relleno local y seguir creando o editando clientes manualmente.",
      ],
    },
    {
      title: "4. Buscar y facturar rápido",
      paragraphs: [
        "Usa el **buscador** para localizar un cliente por nombre o NIF. Al elegirlo, verás solo su ficha en el listado.",
        "El listado no carga todos los clientes de golpe: muestra un bloque inicial y después el botón **Cargar más** para que la página sea más ligera con bases grandes.",
        "En cada cliente puedes pulsar el icono de **factura** o **presupuesto** para crear el documento con sus datos ya rellenados.",
        "Los iconos muestran una pista al pasar el ratón o enfocar con teclado.",
      ],
    },
    {
      title: "5. Unificar clientes repetidos",
      paragraphs: [
        "Si tienes clientes duplicados, usa **Unificar manualmente**. Primero busca por nombre, NIF, teléfono o email, marca los registros repetidos y elige cuál conservar.",
        "Los documentos emitidos mantienen el cliente original por seguridad histórica. Si quieres, puedes actualizar también borradores.",
      ],
    },
    {
      title: "6. Usar un cliente en una factura",
      paragraphs: [
        "Al crear una factura o presupuesto, puedes buscar un cliente existente por nombre para rellenar sus datos al instante.",
        "Si todavía no existe, rellena los datos del cliente en el propio documento y la app guardará la ficha al guardar.",
        "Si editas un cliente después, las facturas ya emitidas **no cambian** (conservan los datos del momento de emisión).",
      ],
      screenshot: {
        src: "/ayuda/capturas/clientes-seleccion.png",
        alt: "Selección de cliente al crear documento",
      },
    },
  ],
};
