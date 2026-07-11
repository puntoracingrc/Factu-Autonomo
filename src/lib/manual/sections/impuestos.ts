import type { ManualSection } from "../types";

export const impuestosSection: ManualSection = {
  slug: "impuestos",
  title: "Impuestos y exportación",
  summary: "Resumen trimestral orientativo y CSV para tu gestor (Pro).",
  order: 9,
  steps: [
    {
      title: "1. Ver el resumen fiscal",
      paragraphs: [
        "En **Impuestos** eliges **Trimestre**, **Año** o **Todo** y luego seleccionas el periodo concreto.",
        "Verás las bases de ventas y gastos, la posición de IVA, el beneficio antes del IRPF, la reserva de IRPF estimada y el resultado tras reservarla.",
        "La posición de IVA se muestra aparte: no se descuenta de ese resultado porque las bases ya están calculadas sin IVA.",
        "Son cifras **orientativas** para preparar el 303 o hablar con tu gestor; no sustituyen la declaración oficial.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-resumen.png",
        alt: "Resumen fiscal por trimestre",
      },
    },
    {
      title: "2. Exportar CSV trimestral (Pro)",
      paragraphs: [
        "Con plan **Pro**, en vista por trimestre aparece el botón **CSV**. Descargas un único archivo con:",
        "cabecera de tu negocio, resumen del periodo, libro de ventas y libro de gastos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-csv.png",
        alt: "Botón de exportación CSV trimestral",
      },
    },
    {
      title: "3. Exportar PDF anual (Pro)",
      paragraphs: [
        "En vista por **año** puedes descargar un PDF resumen del ejercicio.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-pdf-anual.png",
        alt: "Exportación PDF anual",
      },
    },
  ],
};
