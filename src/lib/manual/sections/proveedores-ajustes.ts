import type { ManualSection } from "../types";

export const proveedoresSection: ManualSection = {
  slug: "proveedores",
  title: "Proveedores",
  summary: "Centraliza a quienes les compras y evita duplicados.",
  order: 9,
  steps: [
    {
      title: "1. Dar de alta un proveedor",
      paragraphs: [
        "En **Proveedores** pulsa **Nuevo proveedor** y guarda nombre, NIF, teléfono, web y dirección.",
        "Para la dirección, elige el **tipo de vía** y escribe solo el **nombre de la calle y el número** — sin C/, Avda. ni similares.",
        "Usa el **buscador** para localizar un proveedor y el **ordenador** por nombre, volumen de compras o dirección.",
        "Al registrar un gasto, si eliges proveedor, su NIF puede salir en las exportaciones CSV.",
      ],
      screenshot: {
        src: "/ayuda/capturas/proveedores-nuevo.png",
        alt: "Alta de proveedor",
      },
    },
    {
      title: "2. Unificar duplicados",
      paragraphs: [
        "Si tienes el mismo proveedor repetido con nombres distintos, usa **Unificar manualmente** para fusionar registros.",
      ],
      screenshot: {
        src: "/ayuda/capturas/proveedores-unificar.png",
        alt: "Unificación manual de proveedores",
      },
    },
  ],
};

export const configuracionSection: ManualSection = {
  slug: "configuracion",
  title: "Ajustes avanzados",
  summary: "Frases, formas de pago, numeración, Veri*Factu y copia de datos.",
  order: 10,
  steps: [
    {
      title: "1. Frases y formas de pago reutilizables",
      paragraphs: [
        "En Ajustes puedes guardar **frases** y **formas de pago** que aparecerán como atajos al crear facturas, presupuestos y recibos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-frases.png",
        alt: "Frases reutilizables en ajustes",
      },
    },
    {
      title: "2. Numeración de documentos",
      paragraphs: [
        "Revisa el formato de numeración (F-2026-0001, etc.) y el último número usado para evitar saltos o duplicados.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-numeracion.png",
        alt: "Configuración de numeración",
      },
    },
    {
      title: "3. Tus datos y copia de seguridad",
      paragraphs: [
        "La tarjeta **Tus datos** explica dónde viven tus facturas y gastos, y te permite **exportar una copia JSON** para guardarla o moverla.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-copia.png",
        alt: "Exportar copia de seguridad JSON",
      },
      tip: "Haz una exportación periódica aunque uses la nube: es tu red de seguridad.",
    },
  ],
};
