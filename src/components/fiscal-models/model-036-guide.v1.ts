import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_036_GUIDE_V1 = {
  code: "036",
  intro: [
    "El Modelo 036 sirve para comunicar a la Agencia Tributaria el inicio, modificación o cese de una actividad económica y las obligaciones fiscales relacionadas con autónomos, empresas, entidades y retenedores.",
    "Es una declaración censal, no un impuesto: no calcula ni paga directamente IVA, IRPF, Impuesto sobre Sociedades u otros tributos.",
  ],
  notices: [
    {
      title: "El Modelo 037 ya no está vigente",
      paragraphs: [
        "Desde el 3 de febrero de 2025, las declaraciones censales simplificadas se realizan dentro del propio Modelo 036. Determinadas personas físicas pueden utilizar el Modelo 036 simplificado o Censos WEB si cumplen sus requisitos.",
      ],
    },
  ],
  actions: [
    { label: "Presentar el Modelo 036", href: "https://www1.agenciatributaria.gob.es/wlpl/BU36-M036/MOD036/index.zul", primary: true },
    { label: "Usar Censos WEB", href: "https://www1.agenciatributaria.gob.es/wlpl/BU36-ASIS/M036/index.zul", primary: true },
    { label: "Generar PDF para presentación en papel", href: "https://www2.agenciatributaria.gob.es/wlpl/BU36-M036/MOD036/index.zul", primary: true },
    { label: "Aportar documentación complementaria", href: "https://www1.agenciatributaria.gob.es/wlpl/REGD-JDIT/FG?fTramite=G3229" },
    { label: "Consultar el procedimiento oficial", sourceId: "aeat.model-036.procedure-home.2026-07-10" },
    { label: "Ver la información oficial del modelo", sourceId: "aeat.model-036.information.2026-04-01" },
    { label: "Consultar el manual de Censos WEB", href: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-ayuda-presentacion/manual-ayuda-censos-web.html" },
  ],
  quickSummaryTitle: "El Modelo 036 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "La declaración censal de alta, modificación y baja de empresarios, profesionales y retenedores." },
    { label: "Quién", value: "Autónomos, sociedades, entidades, retenedores y otras personas obligadas a formar parte del censo." },
    { label: "Alta", value: "Antes de iniciar la actividad, realizar operaciones o nacer la obligación de retener." },
    { label: "Modificación", value: "Con carácter general, dentro del mes siguiente al cambio." },
    { label: "Baja", value: "Con carácter general, dentro del mes siguiente al cese; en fallecimiento, seis meses para los sucesores." },
    { label: "Modalidades", value: "Modelo completo, Modelo 036 simplificado y Censos WEB, según el caso." },
  ],
  sections: [
    {
      id: "model-036-chooser",
      title: "¿Necesitas el Modelo 030 o el Modelo 036?",
      cards: [
        { title: "Modelo 030", paragraphs: ["Cambios personales y de domicilio de una persona física que, con carácter general, no forma parte del censo empresarial."], links: [{ label: "Ver Modelo 030", href: "/consultor-fiscal/modelos/030" }] },
        { title: "Modelo 036", paragraphs: ["Alta, modificación o baja de una actividad, una empresa, una entidad o una obligación de retener."], links: [{ label: "Estás en la ficha del Modelo 036", href: "/consultor-fiscal/modelos/036" }] },
      ],
      note: "El Modelo 037 fue suprimido. No existe un «037 nuevo»: la opción simplificada forma parte del propio Modelo 036.",
    },
    {
      id: "model-036-purpose",
      title: "Para qué sirve",
      cards: [
        { title: "Alta censal", bullets: ["Comenzar una actividad empresarial o profesional.", "Solicitar un NIF provisional para una entidad antes de realizar operaciones con trascendencia tributaria.", "Comunicar el comienzo de adquisiciones o gastos preparatorios y, después, el inicio habitual de entregas o servicios.", "Comenzar a satisfacer rentas sujetas a retención."] },
        { title: "Modificación", bullets: ["Cambiar domicilio, actividad o locales.", "Dar de alta o baja obligaciones de IVA, IRPF, Impuesto sobre Sociedades, IRNR o retenciones.", "Solicitar o modificar inscripciones censales como ROI o REDEME cuando proceda.", "Actualizar representantes, socios, partícipes y titulares reales."] },
        { title: "Baja", bullets: ["Comunicar el cese de todas las actividades.", "Dar de baja una entidad extinguida o una persona que deja de formar parte del censo.", "Comunicar el fallecimiento por medio de los sucesores."] },
      ],
    },
    {
      id: "model-036-versions",
      title: "Modelo completo, simplificado y Censos WEB",
      cards: [
        { title: "Modelo 036 completo", paragraphs: ["Incluye todos los apartados censales y es la vía general cuando no se cumplen los requisitos de las opciones simplificadas."] },
        { title: "Modelo 036 simplificado", paragraphs: ["Es una forma reducida del mismo Modelo 036 para determinadas personas físicas residentes en España y con una situación fiscal sencilla."], bullets: ["Debe disponer de NIF y tener el mismo domicilio fiscal y de gestión administrativa.", "No puede ser gran empresa ni actuar por medio de representante.", "No puede estar incluida en regímenes especiales de IVA incompatibles, salvo los permitidos por la AEAT.", "No puede figurar en ROI ni REDEME, realizar adquisiciones intracomunitarias no sujetas, ventas a distancia o determinadas operaciones sujetas a Impuestos Especiales.", "No puede satisfacer rendimientos de capital mobiliario sujetos a retención."] },
        { title: "Censos WEB", paragraphs: ["Es un asistente que hace preguntas y ayuda a generar y presentar el Modelo 036 en casos admitidos. No es universal."], bullets: ["Está orientado a determinadas personas físicas residentes que empiezan una actividad.", "Para personas ya censadas permite, entre otras opciones admitidas, la baja o el cambio de domicilio fiscal.", "Si la situación queda fuera del asistente, debe utilizarse el formulario general."] },
      ],
      note: "Si no se cumple cualquiera de los requisitos de la modalidad simplificada, utiliza el Modelo 036 completo.",
    },
    {
      id: "model-036-data",
      title: "Qué información permite comunicar",
      accordions: [
        { question: "Identidad, domicilio y representación", paragraphs: ["Datos identificativos, domicilio fiscal, domicilio de gestión, representantes y causas de presentación."] },
        { question: "Actividades, locales e IAE", paragraphs: ["Actividad económica, epígrafe, lugar de realización y locales afectos. Si existe exención total en el IAE, el 036 suele sustituir la declaración del 840; si no existe o solo alcanza algunas actividades, puede ser necesario también el Modelo 840."], bullets: ["El Modelo 840 no sustituye al 036."] },
        { question: "IVA", paragraphs: ["Régimen aplicable, inicio de operaciones, sectores diferenciados, prorrata y registros como ROI o REDEME cuando proceda."] },
        { question: "IRPF, Sociedades e IRNR", paragraphs: ["Métodos de determinación del rendimiento en IRPF, obligación por Impuesto sobre Sociedades o condición relativa al Impuesto sobre la Renta de no Residentes."] },
        { question: "Retenciones e ingresos a cuenta", paragraphs: ["Altas y bajas en las obligaciones de retener por trabajo, actividades profesionales, alquileres y otros rendimientos."] },
        { question: "Socios, partícipes y titulares reales", paragraphs: ["Las entidades deben completar los apartados que correspondan. El modelo actual incluye una página específica para identificar titulares reales."] },
      ],
    },
    {
      id: "model-036-documents",
      title: "Documentación y comprobación",
      cards: [
        { title: "Documentos habituales", bullets: ["Escritura o documento de constitución de entidades.", "Acreditación de la representación.", "Licencias, contratos o justificantes relativos a actividad y locales cuando se soliciten.", "Documentación de socios y titulares reales.", "Pruebas específicas para solicitudes como ROI, REDEME o NIF definitivo."] },
        { title: "No hay aceptación automática", paragraphs: ["Algunas solicitudes requieren documentación y comprobación. Presentar el Modelo 036 no significa que una inscripción censal o petición haya sido aceptada automáticamente."], bullets: ["Atiende los requerimientos.", "Consulta después el estado y tus datos censales."] },
      ],
    },
    {
      id: "model-036-errors",
      title: "Errores habituales",
      cards: [
        { title: "Antes de presentar", bullets: ["Utilizar el Modelo 030 para cambios de un autónomo.", "Buscar el antiguo Modelo 037.", "Elegir el 036 simplificado sin cumplir todos los requisitos.", "Confundir una vista previa o predeclaración con una presentación registrada."] },
        { title: "Obligaciones y registros", bullets: ["Olvidar actividades, locales o retenciones.", "Pensar que el 036 sustituye siempre al Modelo 840.", "Dar por concedida la inclusión en ROI o REDEME solo por solicitarla.", "No aportar la documentación complementaria requerida."] },
      ],
    },
  ],
  fillingTitle: "Cómo rellenarlo y presentarlo",
  fillingSteps: [
    { title: "1. Identifica la causa", paragraphs: ["Indica si es alta, modificación o baja y señala las casillas que llevan a los apartados que necesitas completar."] },
    { title: "2. Completa identidad y actividad", paragraphs: ["Revisa NIF, domicilio, representación, actividades, epígrafes y locales. Distingue gastos preparatorios del inicio habitual de operaciones cuando corresponda."] },
    { title: "3. Declara obligaciones", paragraphs: ["Completa solo los bloques aplicables de IVA, IRPF, Sociedades, IRNR, retenciones y registros censales."] },
    { title: "4. Valida y aporta documentos", paragraphs: ["Corrige errores de validación y adjunta la documentación exigida. Una solicitud incompleta puede quedar pendiente de comprobación."] },
    { title: "5. Presenta por el canal correcto", paragraphs: ["La vía electrónica genera un justificante. La predeclaración en papel solo puede usarse cuando esté permitida: debe imprimirse, firmarse, acompañarse de documentos y presentarse en la oficina competente."], bullets: ["La predeclaración tiene una validez limitada de un mes desde su generación.", "Una vista previa en PDF no es una declaración presentada."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Justificante", description: "La presentación electrónica genera un recibo con número de entrada, fecha, hora y código seguro de verificación." },
    { title: "Comprobación", description: "La AEAT puede requerir documentos o comprobar una solicitud antes de reconocer determinados efectos." },
    { title: "Consulta censal", description: "Puedes consultar posteriormente tus actividades, obligaciones y el estado de determinados trámites censales." },
  ],
  comparison: {
    title: "Modelos censales relacionados",
    current: { title: "Modelo 036", description: "Formulario vigente para el censo de empresarios, profesionales y retenedores." },
    related: { title: "Modelo 030", description: "Datos personales y domicilio de personas físicas fuera, con carácter general, del censo empresarial.", href: "/consultor-fiscal/modelos/030", label: "Ver Modelo 030" },
    additional: [
      { title: "Modelo 037", description: "Ficha histórica del antiguo modelo censal simplificado, suprimido desde febrero de 2025.", href: "/consultor-fiscal/modelos/037", label: "Ver ficha histórica" },
      { title: "Modelo 840", description: "Declaración relativa al IAE que puede ser necesaria cuando no existe exención o solo alcanza algunas actividades.", href: "/consultor-fiscal/modelos/840", label: "Ver Modelo 840" },
    ],
    conclusion: "El Modelo 036 simplificado y Censos WEB no sustituyen el criterio de acceso: si la situación no está admitida, debe utilizarse el Modelo 036 completo.",
  },
  pdfNotice: [
    "La predeclaración generada para papel solo es válida cuando ese canal está permitido. Debe imprimirse, firmarse y presentarse con la documentación dentro de su plazo de validez.",
    "Una vista previa, un borrador guardado o un PDF sin registro no acreditan la presentación.",
  ],
  documents: [{ label: "Ver el formulario oficial publicado en el BOE", sourceId: "boe.model-036.form-image.2025-01-09" }],
  officialLinks: [
    { label: "Ayuda de presentación electrónica", sourceId: "aeat.model-036.electronic-help.2026-06-19" },
    { label: "Ficha completa del procedimiento", sourceId: "aeat.model-036.procedure-record.2026-07-10" },
    { label: "Buscador de actividades y obligaciones", href: "https://sede.agenciatributaria.gob.es/Sede/ayuda/herramientas-asistencia-virtual/herramientas-asistencia-virtual-censos-iae.html" },
    { label: "Consultar mis datos censales", href: "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/tramites-censales-relacionados-empresarios-profesionales-retenedores/datos-censales.html" },
  ],
  legalLinks: [{ label: "Orden HAC/1526/2024", sourceId: "boe.order-hac-1526-2024.2025-01-09" }],
  faq: [
    { question: "¿El Modelo 036 es un impuesto?", answer: "No. Es una declaración censal y no calcula ni paga directamente ningún impuesto." },
    { question: "¿Cuándo debo darme de alta?", answer: "Antes de comenzar la actividad, realizar operaciones empresariales o profesionales o nacer la obligación de practicar retenciones." },
    { question: "¿Sigue existiendo el Modelo 037?", answer: "No. Fue suprimido con efectos de 3 de febrero de 2025. Las comunicaciones se realizan ahora mediante el Modelo 036." },
    { question: "¿Qué es el Modelo 036 simplificado?", answer: "Es una forma reducida del propio Modelo 036 para determinadas personas físicas residentes con una situación fiscal sencilla." },
    { question: "¿Qué es Censos WEB?", answer: "Es un asistente de la AEAT que ayuda a determinadas personas físicas a generar y presentar el Modelo 036." },
    { question: "¿Cualquier autónomo puede utilizar Censos WEB?", answer: "No. El servicio tiene un ámbito limitado y deriva al formulario general cuando la actividad o situación no está admitida." },
    { question: "¿Puedo presentar el Modelo 036 en papel?", answer: "Solo cuando la normativa y el trámite lo permiten. Debes generar la predeclaración, imprimirla, firmarla y presentarla con los documentos requeridos." },
    { question: "¿Una vista previa en PDF es válida?", answer: "No. Solo el justificante del registro acredita que la declaración se ha presentado." },
    { question: "¿Cuánto tiempo tengo para comunicar un cambio?", answer: "Con carácter general, un mes desde que se produce la modificación, sin perjuicio de plazos específicos." },
    { question: "¿Cuánto tiempo tengo para darme de baja?", answer: "Con carácter general, un mes desde el cese. En caso de fallecimiento, los sucesores disponen generalmente de seis meses." },
    { question: "¿El Modelo 036 sustituye al Modelo 840?", answer: "No siempre. Si existe exención de IAE por todas las actividades, el 036 suele bastar; en otros casos puede ser necesario también el 840." },
    { question: "¿Presentar el 036 significa que ya estoy en el ROI?", answer: "No necesariamente. La solicitud puede ser comprobada y la inclusión debe confirmarse en los datos censales." },
    { question: "¿Qué es un titular real?", answer: "Es la persona física que posee o controla en último término una entidad según las reglas aplicables. El modelo actual incluye un apartado específico para identificarla." },
    { question: "¿Puede presentarlo un representante?", answer: "Sí, mediante una representación válida y acreditada por los medios admitidos por la AEAT." },
    { question: "¿Qué hago si falta documentación?", answer: "Apórtala mediante el trámite oficial y atiende el requerimiento. La presentación inicial no garantiza la aceptación de la solicitud." },
  ],
  sourceIds: [
    "aeat.model-036.procedure-home.2026-07-10",
    "aeat.model-036.procedure-record.2026-07-10",
    "aeat.model-036.information.2026-04-01",
    "aeat.model-036.electronic-help.2026-06-19",
    "boe.order-hac-1526-2024.2025-01-09",
    "boe.model-036.form-image.2025-01-09",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
