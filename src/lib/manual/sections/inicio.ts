import type { ManualSection } from "../types";

export const inicioSection: ManualSection = {
  slug: "inicio",
  title: "Inicio y avisos",
  summary: "Accesos rápidos y centro de avisos según tu actividad.",
  order: 2,
  intro: [
    "La pantalla de inicio está pensada para actuar rápido: botones de avisos, cliente, factura, presupuesto, recibo y gasto.",
    "El resumen fiscal (trimestre, año o historial completo) está en **Impuestos**.",
  ],
  steps: [
    {
      title: "1. Accesos rápidos",
      paragraphs: [
        "Lo primero que verás son los **botones de colores**. El botón **Avisos** (ámbar) muestra un contador cuando hay recordatorios pendientes.",
        "Desde ahí entras al centro de avisos: perfil incompleto, cobros, gastos fijos, plazos fiscales, límites del plan y más.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-accesos-rapidos.png",
        alt: "Botones de acceso rápido en inicio",
      },
    },
    {
      title: "2. Resumen fiscal",
      paragraphs: [
        "En el menú **Impuestos** tienes el detalle por **trimestre** (por defecto el actual), **año** o **Todo el historial**.",
        "En trimestre verás ingresos, gastos, balance y beneficio bruto; en «Todo», el acumulado con **Por cobrar**.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-trimestre.png",
        alt: "Resumen fiscal en Impuestos",
        caption: "El resumen del trimestre está en Impuestos, no en Inicio.",
      },
    },
  ],
};
