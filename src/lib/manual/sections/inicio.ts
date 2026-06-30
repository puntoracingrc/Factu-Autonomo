import type { ManualSection } from "../types";

export const inicioSection: ManualSection = {
  slug: "inicio",
  title: "Inicio y avisos",
  summary: "Accesos rápidos, recordatorios, instalación y resumen del negocio.",
  order: 2,
  intro: [
    "La pantalla de inicio está pensada para actuar rápido: crear recordatorios, abrir avisos, cliente, factura, presupuesto, recibo y gasto sin bajar por la app.",
    "También incluye la instalación de la app y un resumen del negocio oculto por defecto para que no se vean cifras de un vistazo.",
  ],
  steps: [
    {
      title: "1. Accesos rápidos",
      paragraphs: [
        "El primer botón es **Crear recordatorio**. Después tienes **Avisos** (con contador si hay pendientes), **Nuevo cliente**, **Nueva factura**, **Nuevo presupuesto**, **Nuevo recibo**, **Añadir gasto** y **Configuración**.",
        "Los accesos son botones grandes para móvil. Si Factu muestra un consejo abajo y te molesta, pulsa la **X** para cerrarlo durante esa sesión.",
        "El botón de **Exportar copia** ya no está en Inicio: está en **Cuenta**, junto a sincronización y copias.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-accesos-rapidos.png",
        alt: "Botones de acceso rápido en inicio",
      },
    },
    {
      title: "2. Recordatorios del equipo",
      paragraphs: [
        "La sección **Recordatorios del equipo** solo aparece en Inicio cuando hay tareas pendientes.",
        "Marca el check al completarlas o pulsa **Ir** si el recordatorio tiene un enlace rápido. Si no elegiste enlace al crearlo, no se fuerza ninguna pantalla concreta.",
        "En **Avisos > Mis tareas** puedes crear recordatorios personales o de oficina. El enlace rápido puede ser **Sin enlace**, **Generar** (presupuesto, factura o recibo, con cliente opcional) o **Rectificar** (buscando el documento por cliente, número o importe).",
        "Si eres Pro, puedes usar **Dictar con IA** para hablar y convertir la voz en texto del recordatorio. Revisa siempre la transcripción antes de guardarlo.",
        "Si compartís la **misma cuenta Pro con nube**, los recordatorios «Para oficina» se sincronizan mientras la app está abierta.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-recordatorios.png",
        alt: "Recordatorios del equipo y enviar a oficina en Inicio",
        caption: "Los recordatorios «Para oficina» los ve quien esté en el PC con la misma cuenta.",
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
      title: "4. Instalar app y resumen del negocio",
      paragraphs: [
        "El bloque **Instalar app** te ayuda a añadir Factura Autónomo como acceso directo en móvil, Windows o Mac.",
        "El **Resumen del negocio** está colapsado por defecto. Pulsa **Mostrar resumen** para ver cifras, gráfica y últimos movimientos por mes, trimestre, año o todo.",
        "Las cifras son orientativas y se calculan con los datos guardados en la app. Para el resumen fiscal trimestral, entra en **Impuestos**.",
      ],
    },
  ],
};
