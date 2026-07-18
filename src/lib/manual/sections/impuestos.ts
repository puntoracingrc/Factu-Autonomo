import type { ManualSection } from "../types";

export const impuestosSection: ManualSection = {
  slug: "impuestos",
  title: "Impuestos y exportación",
  summary:
    "Resumen fiscal y exportación CSV, PDF anual o carpeta de facturas (Pro).",
  order: 9,
  steps: [
    {
      title: "1. Ver el resumen fiscal",
      paragraphs: [
        "En **Impuestos** eliges **Trimestre**, **Meses**, **Año** o **Todo** y luego seleccionas el periodo concreto. La vista **Meses** admite de uno a tres meses consecutivos del mismo año.",
        "**Ingresos facturados** suma las facturas y recibos fiscales emitidos del periodo aunque sigan pendientes de cobro. El estado de cobro se usa para tesorería y para mostrar **Por cobrar**, pero no excluye una venta ya facturada del resumen fiscal general.",
        "Verás las bases de ventas y gastos deducibles, el coste económico de los gastos, la posición de IVA, el beneficio económico, la base estimada para IRPF, la reserva orientativa y el resultado económico tras reservarla.",
        "La posición de IVA se muestra aparte: no se descuenta del beneficio ni del resultado económico porque sus bases ya están calculadas sin IVA.",
        "Los gastos marcados como **No deducibles** siguen en el gasto registrado, el balance y la rentabilidad y sí reducen el beneficio económico. Aportan cero a la base e IVA deducibles, por lo que no reducen la base ni la reserva estimada de IRPF. El resumen muestra un aviso con ese coste.",
        "El resumen distingue los gastos cuyo IVA se calcula desde líneas conciliadas de los que usan la cabecera o el contrato de importe íntegro para un fijo no desgravable. Si detecta evidencia de tipos de IVA en conflicto y líneas incompletas o descuadradas, muestra un bloqueo de revisión y no presenta la exportación como completa.",
        "En una compra sometida a recargo de equivalencia, el IVA soportado y el recargo no se recuperan: ambos forman parte del coste y del gasto orientativo de IRPF, mientras la base y el IVA deducibles en IVA son cero. La app conserva la cuota de recargo separada para que el total documental sea trazable.",
        "El campo mostrado como **Gasto neto deducible en IRPF** no es una base de IVA. El régimen general de la actividad y sus ventas no se infieren a partir de una sola factura de proveedor; el resumen sigue siendo orientativo.",
        "Los importes de gastos son **netos de abonos**. Un abono deducible reduce base, IVA y coste económico en su propio periodo; uno no deducible solo revierte el coste económico y mantiene base e IVA deducibles en cero. Compra y abono iguales dentro del mismo periodo se compensan. En periodos distintos, cada movimiento permanece en su fecha.",
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
        "Cada gasto publica sus tipos, cuota, desglose y origen del cálculo. Los gastos legacy sin líneas siguen como **IVA de cabecera** y los fijos no desgravables como **importe íntegro**; un desglose mixto inconsistente bloquea el CSV hasta su corrección.",
        "El recargo de equivalencia aparece en una columna separada y nunca se suma de nuevo a un reparto de trabajo: ya está incluido proporcionalmente en el coste operativo.",
        "El libro identifica cada **Abono / saldo a favor** y conserva su signo. El resumen y los totales se presentan como coste, base e IVA netos de gastos y abonos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-csv.png",
        alt: "Botón de exportación CSV trimestral",
      },
    },
    {
      title: "3. Descargar las facturas del periodo en PDF (Pro)",
      paragraphs: [
        "En las vistas **Trimestre** y **Meses**, pulsa **Facturas PDF** para preparar todas las facturas emitidas de ese periodo. El máximo es de tres meses y los presupuestos, recibos y borradores no se incluyen.",
        "La descarga es un ZIP que contiene una carpeta local. Un trimestre fiscal se nombra, por ejemplo, **Facturas Trimestre 2 2026**; un mes, **Facturas Mayo 2026**; y un rango no trimestral, **Facturas Mayo-Julio 2026**.",
        "Cada archivo se genera desde la copia fiscal congelada y verificada del documento, no desde campos vivos que hayan cambiado después. Los históricos importados y aceptados conservan su tratamiento propio sin fabricarles un sello moderno.",
        "Si una factura del periodo tiene la integridad pendiente o su PDF original no puede reconstruirse de forma segura, Factu bloquea el paquete completo y muestra qué documentos debes revisar. Nunca descarga silenciosamente una carpeta incompleta.",
      ],
      tip: "Al descomprimir el ZIP encontrarás directamente la carpeta con todos los PDF del periodo.",
    },
    {
      title: "4. Exportar PDF anual (Pro)",
      paragraphs: [
        "En vista por **año** puedes descargar un PDF resumen del ejercicio.",
        "El PDF separa coste económico, base fiscal deducible y base estimada para IRPF, e identifica cada gasto no deducible.",
        "En la tabla de gastos también aparecen de forma compacta el origen y los tipos de IVA. Igual que el CSV, el PDF no se genera si hay un desglose mixto conocido pero sin conciliar.",
        "Los abonos se rotulan como **Abono · saldo a favor**, mantienen importes negativos y se descuentan de los totales netos del ejercicio.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-pdf-anual.png",
        alt: "Exportación PDF anual",
      },
    },
  ],
};
