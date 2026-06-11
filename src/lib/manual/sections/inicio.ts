import type { ManualSection } from "../types";

export const inicioSection: ManualSection = {
  slug: "inicio",
  title: "Inicio y resumen",
  summary: "Lo primero que ves al abrir la app: trimestre actual y totales.",
  order: 2,
  intro: [
    "La pantalla de inicio te da una foto rápida de cómo va el negocio. Está organizada para que lo más urgente —el trimestre en curso— esté arriba.",
  ],
  steps: [
    {
      title: "1. Resumen del trimestre actual",
      paragraphs: [
        "Arriba verás el **trimestre en curso** (por ejemplo, «2.º trimestre 2026») con cuatro cifras grandes:",
        "**Ingresos cobrados**, **Gastos**, **Balance** y **Beneficio bruto estimado** de ese trimestre solamente.",
        "Debajo hay un enlace **Ver detalle fiscal** que te lleva a Impuestos con el desglose de IVA e IRPF orientativo.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-trimestre.png",
        alt: "Resumen del trimestre en la pantalla de inicio",
        caption: "El trimestre actual aparece destacado arriba.",
      },
    },
    {
      title: "2. Acumulado total (historial)",
      paragraphs: [
        "Más abajo, en un bloque más discreto, está el **Acumulado total**: ingresos, gastos, balance y **Por cobrar** con **todo tu historial**.",
        "«Por cobrar» son las facturas pendientes ahora mismo, no solo del trimestre.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-acumulado.png",
        alt: "Bloque de acumulado total en inicio",
      },
    },
    {
      title: "3. Accesos rápidos",
      paragraphs: [
        "Los botones de colores te permiten crear un cliente, factura, presupuesto, recibo o gasto sin buscar en el menú.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-accesos-rapidos.png",
        alt: "Botones de acceso rápido en inicio",
      },
    },
  ],
};
