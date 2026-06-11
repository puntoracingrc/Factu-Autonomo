import type { ManualSection } from "../types";

export const inicioSection: ManualSection = {
  slug: "inicio",
  title: "Inicio y avisos",
  summary: "Recordatorios del equipo, accesos rápidos y centro de avisos.",
  order: 2,
  intro: [
    "La pantalla de inicio está pensada para actuar rápido: recordatorios compartidos, botones de avisos, cliente, factura, presupuesto, recibo y gasto.",
    "El resumen fiscal (trimestre, año o historial completo) está en **Impuestos**.",
  ],
  steps: [
    {
      title: "1. Recordatorios del equipo",
      paragraphs: [
        "Arriba verás **Recordatorios del equipo**: marca el check al completarlos.",
        "Desde el móvil puedes usar **Enviar a oficina** con plantillas (factura pendiente, devolver llamada, rectificar…).",
        "Compartid la **misma cuenta Pro con nube**: los recordatorios «Para oficina» se sincronizan cada ~45 s si la pestaña está abierta.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-recordatorios.png",
        alt: "Recordatorios del equipo y enviar a oficina en Inicio",
        caption: "Los recordatorios «Para oficina» los ve quien esté en el PC con la misma cuenta.",
      },
    },
    {
      title: "2. Accesos rápidos",
      paragraphs: [
        "En **¿Qué quieres hacer?** tienes acceso directo a **Avisos** (con contador si hay pendientes), **Clientes**, **Nueva factura**, **Nuevo presupuesto**, **Nuevo recibo** y **Añadir gasto**.",
        "Factu también puede mostrarte un consejo para descubrir funciones que aún no has probado.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-accesos-rapidos.png",
        alt: "Botones de acceso rápido en inicio",
      },
    },
    {
      title: "3. Centro de avisos",
      paragraphs: [
        "Pulsa **Avisos** para abrir el centro de avisos.",
        "En **Mis tareas** gestionas recordatorios manuales; en **Automáticos** verás avisos de la app (perfil incompleto, facturas impagadas, IVA…) y consejos de Factu.",
      ],
      screenshot: {
        src: "/ayuda/capturas/avisos-centro.png",
        alt: "Página de avisos con pestañas Mis tareas y Automáticos",
      },
    },
    {
      title: "4. Resumen fiscal",
      paragraphs: [
        "En el menú **Impuestos** eliges **Trimestre** (por defecto el actual), **Año** o **Todo**.",
        "En trimestre verás ingresos, gastos, balance y beneficio bruto; en «Todo», el acumulado con **Por cobrar**.",
      ],
      screenshot: {
        src: "/ayuda/capturas/impuestos-trimestre.png",
        alt: "Resumen fiscal por trimestre en Impuestos",
        caption: "El resumen del trimestre está en Impuestos, no en Inicio.",
      },
    },
  ],
};
