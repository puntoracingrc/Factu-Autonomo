import type { ManualSection } from "../types";

export const modelosAeatSection: ManualSection = {
  slug: "modelos-aeat",
  title: "Modelos AEAT",
  summary:
    "Busca fichas de modelos, consulta sus fuentes oficiales y organiza tu selección personal.",
  order: 9.35,
  intro: [
    "El catálogo de **Modelos AEAT** reúne fichas informativas basadas en fuentes oficiales de la AEAT y el BOE. Puedes consultar **Todos** los modelos en cualquier momento.",
    "La vista **Mis modelos** combina las recomendaciones orientativas del diagnóstico fiscal con los modelos que marques tú. Organizar el catálogo no presenta declaraciones ni cambia tus obligaciones fiscales.",
  ],
  steps: [
    {
      title: "1. Buscar en todo el catálogo",
      paragraphs: [
        "Abre **Asesoría fiscal → Modelos AEAT** y escribe en **Buscar modelos**. Puedes buscar por **Código, nombre o concepto**, por ejemplo **303**, **IVA**, **retenciones** o **arrendamiento**. No hace falta pulsar un botón: las tarjetas se filtran mientras escribes.",
        "El buscador consulta todo el catálogo aunque en pantalla solo se haya cargado el primer tramo. Pulsa **Cargar 30 más** para mostrar otras treinta tarjetas cuando quieras seguir recorriendo la lista sin una búsqueda.",
        "Pulsa **Limpiar** o borra el texto para recuperar la vista anterior.",
      ],
      tip: "La búsqueda se realiza dentro de Factu y no inicia ningún trámite con la AEAT.",
    },
    {
      title: "2. Cambiar entre Todos y Mis modelos",
      paragraphs: [
        "Selecciona **Todos** para ver el catálogo completo. Esta opción permanece disponible aunque hayas guardado un diagnóstico o una selección personal.",
        "Selecciona **Mis modelos** para reunir los modelos recomendados por el diagnóstico y los que hayas añadido manualmente. Si la vista todavía no está disponible, pulsa **Abrir diagnóstico**, completa y confirma el test de autónomos y vuelve al catálogo.",
        "Los contadores indican cuántas fichas contiene cada vista. Una recomendación orientativa sirve para organizar la consulta; revisa la ficha y las fuentes oficiales antes de actuar.",
      ],
    },
    {
      title: "3. Reconocer y cambiar tu selección",
      paragraphs: [
        "La **estrella verde** indica que el modelo está en **Mis modelos**. Si lo ha recomendado el diagnóstico, aparece marcada automáticamente y no se puede quitar desde la tarjeta.",
        "En los demás modelos, pulsa la estrella para añadirlos manualmente a **Mis modelos**. Vuelve a pulsarla para retirarlos de tu selección personal. Esta elección complementa el diagnóstico, pero no altera su resultado.",
      ],
      tip: "Todos conserva siempre el catálogo íntegro, incluidos los modelos que no estén en tu selección.",
    },
    {
      title: "4. Leer una tarjeta y abrir la ficha",
      paragraphs: [
        "Cada tarjeta muestra el código, el nombre, un resumen y, cuando existe, una miniatura del formulario oficial o una ilustración del tipo de trámite. Las etiquetas ayudan a reconocer rápidamente el tema del modelo.",
        "Pulsa **Ver ficha** para abrir el detalle. Las fichas completadas reúnen, según la información oficial disponible, una explicación práctica, formas de tramitación, formulario e instrucciones, normativa, **Preguntas frecuentes** y enlaces a las fuentes de la AEAT o del BOE.",
        "Una etiqueta **Revisión pendiente** indica que la ficha todavía conserva información limitada. Los modelos históricos aparecen identificados como **Histórico · no vigente** para no confundirlos con un trámite actual.",
      ],
    },
    {
      title: "5. Llegar desde el Calendario fiscal",
      paragraphs: [
        "Cuando pulsas un código reconocido en el **Calendario fiscal**, Factu abre el catálogo, se desplaza hasta la tarjeta correspondiente y la resalta.",
        "Desde esa tarjeta puedes abrir la ficha sin perder el origen. Usa **Volver al Calendario** en la tarjeta o en el detalle para regresar.",
      ],
      tip: "Las fichas informan y enlazan fuentes oficiales. Factu no presenta, firma, paga ni envía modelos desde este catálogo.",
    },
  ],
};
