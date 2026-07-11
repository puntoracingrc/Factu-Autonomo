import type { ManualSection } from "../types";

export const inicioSection: ManualSection = {
  slug: "inicio",
  title: "Panel y avisos",
  summary: "Accesos rápidos, recordatorios, instalación y resumen del negocio.",
  order: 3,
  intro: [
    "El panel está pensado para actuar rápido: crear recordatorios, abrir avisos, cliente, factura, presupuesto, recibo y gasto sin bajar por la app.",
    "También incluye un resumen del negocio visible por defecto, que puedes ocultar si no quieres enseñar cifras en pantalla, y la instalación de la app al final.",
  ],
  steps: [
    {
      title: "1. Accesos rápidos",
      paragraphs: [
        "El primer botón es **Crear recordatorio**. Después tienes **Avisos** (con contador si hay pendientes), **Nuevo cliente**, **Nueva factura**, **Nuevo presupuesto**, **Nuevo recibo**, **Gastos**, **Nuevo producto** y **Ajustes**.",
        "Los accesos son botones grandes y también funcionan bien en móvil. En pantallas estrechas, Factu no flota sobre el contenido para no tapar botones ni formularios.",
        "En ordenador, Factu queda como un acceso discreto abajo a la derecha. Si aparece una notificación pequeña y no la necesitas, puedes cerrarla con la **X**.",
        "El botón de **Exportar copia** ya no está en Panel: está en **Cuenta**, junto a sincronización y copias.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-accesos-rapidos.png",
        alt: "Botones de acceso rápido en el panel",
      },
    },
    {
      title: "2. Recordatorios del equipo",
      paragraphs: [
        "La sección **Recordatorios del equipo** solo aparece en Panel cuando hay tareas pendientes.",
        "Marca el check al completarlas o pulsa **Ir** si el recordatorio tiene un enlace rápido. Si no elegiste enlace al crearlo, no se fuerza ninguna pantalla concreta.",
        "En **Avisos > Mis tareas** puedes crear recordatorios personales o de oficina. El enlace rápido puede ser **Sin enlace**, **Generar** (presupuesto, factura o recibo, con cliente opcional) o **Rectificar** (buscando el documento por cliente, número o importe).",
        "Si eres Pro, puedes usar **Dictar con IA** para hablar y convertir la voz en texto del recordatorio. Factu intentará rellenar todos los campos con el dictado, pero puede fallar al captar el cliente si tienes algunos muy parecidos. También entiende frases como «borra todo» o «empezamos de nuevo» para limpiar el borrador.",
        "Si compartís la **misma cuenta Pro con nube**, los recordatorios «Para oficina» se sincronizan mientras la app está abierta.",
      ],
      screenshot: {
        src: "/ayuda/capturas/inicio-recordatorios.png",
        alt: "Recordatorios del equipo y enviar a oficina en Panel",
        caption:
          "Los recordatorios «Para oficina» los ve quien esté en el PC con la misma cuenta.",
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
      title: "4. Resumen del negocio e instalación",
      paragraphs: [
        "El **Resumen del negocio** aparece abierto por defecto. Puedes elegir periodo y año dentro del propio bloque, o pulsar **Ocultar resumen** si no quieres enseñar cifras.",
        "En **Facturado** se excluyen borradores, anulaciones y facturas originales ya sustituidas. Si una corrección rectificativa positiva reemplaza a una factura, cuenta el reemplazo vigente una sola vez; una rectificativa de anulación no se presenta como nueva facturación.",
        "El bloque **Instalar app** queda al final del Panel y te ayuda a añadir Facturación Autónomos como acceso directo en móvil, Windows o Mac.",
        "Las cifras son orientativas y se calculan con los datos guardados en la app. Para el resumen fiscal trimestral, entra en **Impuestos**.",
      ],
    },
  ],
};
