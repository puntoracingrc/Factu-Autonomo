import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_037_GUIDE_V1 = {
  code: "037",
  intro: [
    "El Modelo 037 fue una declaración censal simplificada que podían utilizar determinadas personas físicas para darse de alta, modificar datos o darse de baja en el Censo de empresarios, profesionales y retenedores.",
    "Modelo suprimido desde el 3 de febrero de 2025. Esta página se conserva como referencia histórica y no ofrece un trámite de presentación vigente.",
  ],
  notices: [
    {
      title: "Modelo histórico · no vigente",
      paragraphs: [
        "Las nuevas altas, modificaciones y bajas censales se presentan mediante el Modelo 036. Si eres una persona física y tu situación es sencilla, la AEAT puede ofrecerte el Modelo 036 simplificado o Censos WEB.",
      ],
    },
  ],
  actions: [
    { label: "Ver el Modelo 036 actual", internalHref: "/consultor-fiscal/modelos/036", primary: true },
    { label: "Usar Censos WEB", href: "https://www1.agenciatributaria.gob.es/wlpl/BU36-ASIS/M036/index.zul", primary: true },
    { label: "Consultar qué modelo censal necesito", href: "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal.html" },
    { label: "Información oficial sobre la supresión", sourceId: "aeat.model-037.retirement-manual.2025-09-29" },
  ],
  quickSummaryTitle: "El Modelo 037 en pocas palabras",
  quickFacts: [
    { label: "Estado", value: "Histórico y no vigente." },
    { label: "Fecha de supresión", value: "3 de febrero de 2025." },
    { label: "Qué era", value: "Una declaración censal simplificada para determinadas personas físicas." },
    { label: "Qué usar ahora", value: "El Modelo 036." },
    { label: "Opción sencilla actual", value: "Modelo 036 simplificado o Censos WEB, cuando se cumplen sus requisitos." },
    { label: "Declaraciones antiguas", value: "Las presentadas correctamente mientras estaba vigente permanecen en el historial censal." },
  ],
  sections: [
    {
      id: "model-037-what-was",
      title: "Qué era el Modelo 037",
      cards: [
        { title: "Declaración simplificada", paragraphs: ["Permitía a determinadas personas físicas comunicar de manera simplificada su alta, modificación o baja como empresarios, profesionales o retenedores."] },
        { title: "Ámbito limitado", paragraphs: ["No servía para cualquier empresario o entidad. Su uso dependía de requisitos personales, censales y tributarios concretos."] },
      ],
    },
    {
      id: "model-037-why-retired",
      title: "Por qué fue suprimido",
      intro: [
        "El Modelo 037 se creó como una versión más sencilla del Modelo 036.",
        "La extensión de la presentación electrónica, los asistentes censales, el buscador de actividades y las mejoras del propio Modelo 036 permitieron ofrecer esa simplificación dentro del Modelo 036. Por ese motivo, la Orden HAC/1526/2024 suprimió el Modelo 037.",
      ],
    },
    {
      id: "model-037-current-route",
      title: "Qué debes utilizar ahora",
      cards: [
        { title: "Persona física con situación sencilla", bullets: ["Prueba Censos WEB o comprueba si puedes utilizar el Modelo 036 simplificado.", "Si el asistente indica que tu caso no está admitido, utiliza el Modelo 036 completo."], links: [{ label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" }] },
        { title: "Sociedad, entidad o situación compleja", bullets: ["Utiliza el Modelo 036 completo.", "Incluye la documentación y los apartados censales que correspondan."] },
        { title: "Cambio de actividad u obligaciones", bullets: ["Utiliza el Modelo 036 para altas, modificaciones o bajas posteriores al 3 de febrero de 2025."] },
      ],
    },
    {
      id: "model-037-vs-036-simple",
      title: "037 histórico frente al 036 simplificado",
      cards: [
        { title: "Modelo 037", bullets: ["Era un modelo independiente.", "Tenía su propio número y formulario.", "Está suprimido y no admite nuevas presentaciones."] },
        { title: "Modelo 036 simplificado", bullets: ["Forma parte del propio Modelo 036.", "Solo está disponible para determinadas personas físicas que cumplen todos sus requisitos.", "Es una presentación vigente del Modelo 036, no un «Modelo 037 nuevo»."] },
      ],
    },
    {
      id: "model-037-previous-filings",
      title: "Qué ocurre con un 037 presentado antes",
      cards: [
        { title: "Conserva su valor histórico", paragraphs: ["Una declaración correctamente presentada cuando el modelo estaba vigente forma parte del historial censal. No es necesario presentarla de nuevo únicamente porque el Modelo 037 haya sido suprimido."] },
        { title: "Las variaciones nuevas van por el 036", paragraphs: ["Cualquier alta, cambio o baja posterior a la fecha de supresión debe comunicarse mediante el Modelo 036 por el canal actual que corresponda."] },
      ],
    },
  ],
  fillingTitle: "Cómo actuar según tu situación actual",
  fillingSteps: [
    { title: "1. No presentes el 037", paragraphs: ["No uses copias antiguas ni enlaces históricos para una comunicación nueva."] },
    { title: "2. Comprueba la vía del 036", paragraphs: ["Si eres persona física, revisa Censos WEB o los requisitos del Modelo 036 simplificado. En los demás casos, usa el 036 completo."] },
    { title: "3. Conserva el justificante antiguo", paragraphs: ["Si presentaste un 037 cuando estaba vigente, conserva el recibo y consulta tus datos censales para comprobar la situación actual."] },
  ],
  afterTitle: "Documentación histórica y gestiones actuales",
  afterSteps: [
    { title: "Antes del 3 de febrero de 2025", description: "Los justificantes de declaraciones 037 válidamente presentadas siguen documentando el historial censal." },
    { title: "Desde el 3 de febrero de 2025", description: "Las nuevas comunicaciones censales se realizan mediante el Modelo 036." },
    { title: "Consulta actual", description: "Censos WEB y los servicios censales de la AEAT ayudan a elegir y completar la vía vigente." },
  ],
  comparison: {
    title: "El formulario que lo sustituye",
    current: { title: "Modelo 037 · histórico", description: "Modelo independiente suprimido. Esta ficha solo explica su función y el cambio normativo." },
    related: { title: "Modelo 036 · vigente", description: "Declaración censal actual de alta, modificación y baja, con modalidad simplificada para ciertos casos.", href: "/consultor-fiscal/modelos/036", label: "Ir al Modelo 036" },
    conclusion: "No llames «Modelo 037 nuevo» al 036 simplificado: es una modalidad del Modelo 036 y solo puede utilizarse si se cumplen sus requisitos.",
  },
  pdfNotice: [
    "El formulario que se conserva es histórico. Se muestra para documentar cómo era el modelo, no para rellenarlo ni presentarlo actualmente.",
    "Para una alta, modificación o baja nueva utiliza el Modelo 036.",
  ],
  documents: [{ label: "Formulario histórico del Modelo 037 · no vigente", sourceId: "boe.model-037.original-form-pdf.2007-05-10" }],
  officialLinks: [
    { label: "Información de la AEAT sobre la supresión", sourceId: "aeat.model-037.retirement-manual.2025-09-29" },
    { label: "Noticia oficial sobre la modificación censal", sourceId: "aeat.model-037.retirement-news.2025-12-01" },
  ],
  actionGroups: [
    {
      title: "Documentación histórica · no válida para nuevas presentaciones",
      description: "Estos enlaces se conservan únicamente para consultar la regulación y el formulario que existían cuando el modelo estaba vigente.",
      links: [
        { label: "Publicación original del formulario", sourceId: "boe.model-037.original-form-pdf.2007-05-10" },
        { label: "Orden de aprobación EHA/1274/2007", sourceId: "boe.model-037.order-eha-1274-2007" },
      ],
    },
  ],
  legalLinks: [
    { label: "Orden HAC/1526/2024 · supresión del Modelo 037", sourceId: "boe.model-037.order-hac-1526-2024" },
    { label: "Orden EHA/1274/2007 · regulación histórica", sourceId: "boe.model-037.order-eha-1274-2007" },
  ],
  faq: [
    { question: "¿Sigue vigente el Modelo 037?", answer: "No. Fue suprimido con efectos de 3 de febrero de 2025." },
    { question: "¿Qué modelo debo utilizar ahora?", answer: "El Modelo 036." },
    { question: "¿Existe una versión sencilla del Modelo 036?", answer: "Sí. Determinadas personas físicas pueden utilizar el Modelo 036 simplificado si cumplen todos sus requisitos." },
    { question: "¿Qué es Censos WEB?", answer: "Es un asistente de la AEAT que ayuda a determinadas personas físicas a generar y presentar el Modelo 036 en situaciones admitidas." },
    { question: "¿Puedo descargar el Modelo 037 y presentarlo?", answer: "No para una comunicación nueva. El formulario se conserva como documentación histórica y la vía vigente es el Modelo 036." },
    { question: "¿Tengo que repetir una declaración 037 que presenté antes de su supresión?", answer: "No únicamente por la supresión del modelo. Las nuevas variaciones deben comunicarse mediante el Modelo 036." },
    { question: "¿El Modelo 036 simplificado es igual que el antiguo 037?", answer: "No. El 036 simplificado forma parte del Modelo 036 y tiene sus propios requisitos actuales; el 037 era un modelo independiente." },
    { question: "¿Puedo usar Censos WEB para cualquier actividad?", answer: "No. El asistente tiene un ámbito limitado y dirige al formulario general si la situación no está admitida." },
    { question: "¿Dónde consulto un 037 antiguo?", answer: "Conserva el justificante y consulta tus datos censales en la AEAT. Esta ficha solo ofrece contexto y documentación histórica." },
    { question: "¿Por qué se mantiene esta página?", answer: "Porque muchas personas aún buscan el antiguo código. La página explica el cambio, enlaza el Modelo 036 actual y evita usar un formulario suprimido." },
  ],
  sourceIds: [
    "aeat.model-037.retirement-manual.2025-09-29",
    "aeat.model-037.retirement-news.2025-12-01",
    "aeat.model-037.historical-presentation-reference.2025-10-10",
    "boe.model-037.order-eha-1274-2007",
    "boe.model-037.original-form-pdf.2007-05-10",
    "boe.model-037.order-hac-1526-2024",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
