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
        "Verás las bases de ventas y gastos deducibles, el coste económico de los gastos, la posición de IVA, el beneficio económico, la base estimada para IRPF, la reserva orientativa y el resultado económico tras reservarla.",
        "La posición de IVA se muestra aparte: no se descuenta del beneficio ni del resultado económico porque sus bases ya están calculadas sin IVA.",
        "Los gastos marcados como **No deducibles** siguen en el gasto registrado, el balance y la rentabilidad y sí reducen el beneficio económico. Aportan cero a la base e IVA deducibles, por lo que no reducen la base ni la reserva estimada de IRPF. El resumen muestra un aviso con ese coste.",
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
        "El resumen separa coste económico, beneficio económico y base estimada para IRPF. El libro conserva los gastos no deducibles con su coste y los identifica expresamente; sus columnas de base e IVA deducibles quedan a cero.",
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
        "El PDF separa coste económico, base fiscal deducible y base estimada para IRPF, e identifica cada gasto no deducible.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-pdf-anual.png",
        alt: "Exportación PDF anual",
      },
    },
  ],
};
