import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_143_GUIDE_V1 = {
  code: "143",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 143 permite solicitar el abono mensual anticipado de determinadas deducciones familiares del IRPF.",
    "Puede abarcar familia numerosa, descendientes o ascendientes con discapacidad, ascendiente separado o sin vínculo matrimonial con dos hijos y cónyuge no separado legalmente con discapacidad, siempre que se cumplan sus requisitos específicos.",
  ],
  notices: [
    {
      title: "No todas las familias cumplen los mismos requisitos",
      paragraphs: ["Título de familia numerosa, mínimos por descendientes o ascendientes, discapacidad, convivencia, anualidades, rentas y alta o prestaciones se comprueban de forma diferente según la deducción."],
    },
    {
      title: "Individual y colectiva tienen efectos distintos",
      paragraphs: ["La solicitud colectiva implica la cesión del derecho al primer solicitante. La modalidad solo puede cambiarse en enero y no se renueva cada año si continúa el derecho."],
    },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 143", sourceId: "aeat.model-143.procedure-home.2026-03-25", primary: true },
    { label: "Consultar preguntas frecuentes oficiales", sourceId: "aeat.model-143.faq.2026-03-25", primary: true },
    { label: "Ver ayuda de presentación electrónica", sourceId: "aeat.model-143.electronic-help.2026-06-19" },
    { label: "Ver la declaración anual de Renta", internalHref: "/consultor-fiscal/modelos/100" },
  ],
  quickSummaryTitle: "El Modelo 143 en pocas palabras",
  quickFacts: [
    { label: "Qué solicita", value: "El abono anticipado de determinadas deducciones familiares del artículo 81 bis." },
    { label: "Cuantía general", value: "Hasta 100 € al mes por cada deducción; familia numerosa especial, hasta 200 € al mes." },
    { label: "Hijos adicionales", value: "Hasta 50 € mensuales por cada hijo que exceda del mínimo de la categoría." },
    { label: "Autónomos", value: "En los regímenes especiales no citados específicamente, alta al menos 15 días del mes." },
    { label: "Modalidades", value: "Solicitud individual o colectiva; el cambio solo se tramita en enero." },
    { label: "Variaciones", value: "Deben comunicarse dentro de los 15 días naturales siguientes cuando afecten al cobro." },
  ],
  sections: [
    {
      id: "model-143-deductions",
      title: "Qué deducciones puede anticipar",
      cards: [
        { title: "Familia numerosa", paragraphs: ["Para ascendientes o hermanos huérfanos de padre y madre que formen parte de una familia numerosa con título en vigor."] },
        { title: "Descendientes o ascendientes con discapacidad", paragraphs: ["Por cada persona que genere el mínimo correspondiente y cumpla los requisitos. Se presenta una solicitud por cada ascendiente o descendiente."] },
        { title: "Ascendiente con dos hijos", paragraphs: ["Para el ascendiente separado legalmente o sin vínculo matrimonial, con dos hijos sin derecho a anualidades por alimentos y derecho a la totalidad del mínimo por descendientes."] },
        { title: "Cónyuge con discapacidad", paragraphs: ["Por cónyuge no separado legalmente con discapacidad, con el límite de rentas y las incompatibilidades previstas en el artículo 81 bis."] },
      ],
    },
    {
      id: "model-143-requirements",
      title: "Alta, cotización y prestaciones",
      cards: [
        { title: "Autónomos y mutualistas", paragraphs: ["Los trabajadores incluidos en regímenes especiales distintos de los supuestos laborales específicos y los mutualistas alternativos deben estar de alta durante al menos 15 días del mes."] },
        { title: "Trabajo por cuenta ajena", paragraphs: ["La AEAT diferencia jornada completa, tiempo parcial y sistema agrario: 15 días, alta durante todo el mes con al menos el 50 % de jornada o 10 jornadas reales, según el caso."] },
        { title: "Desempleo y pensiones", paragraphs: ["Quienes perciben prestaciones contributivas o asistenciales de desempleo, determinadas pensiones o prestaciones equivalentes de mutualidades no están sujetos al requisito de alta mensual. Estar inscrito como demandante sin cobrar prestación no basta."] },
        { title: "Identificación", paragraphs: ["Solicitantes, titulares de familia numerosa y personas relacionadas deben disponer de NIF válido, además de los títulos o acreditaciones exigibles."] },
      ],
    },
    {
      id: "model-143-amounts",
      title: "Cuantías orientativas del abono",
      cards: [
        { title: "Importe general", paragraphs: ["Hasta 100 euros al mes y 1.200 euros al año por cada deducción de familia numerosa general, ascendiente con dos hijos, persona con discapacidad o cónyuge con discapacidad."] },
        { title: "Familia numerosa especial", paragraphs: ["Hasta 200 euros al mes y 2.400 euros al año por la categoría especial."] },
        { title: "Hijos por encima del mínimo", paragraphs: ["El incremento puede alcanzar 50 euros al mes y 600 euros al año por cada hijo que exceda del número mínimo exigido para la categoría general o especial."] },
        { title: "Límites y prorrateo", paragraphs: ["El importe efectivo depende de meses con derecho, cotizaciones cuando limitan la deducción, número de beneficiarios y modalidad individual o colectiva."] },
      ],
      note: "Las cuantías son máximos legales, no una promesa de cobro. La AEAT determina el derecho con los datos del caso.",
    },
    {
      id: "model-143-modalities",
      title: "Solicitud individual o colectiva",
      cards: [
        { title: "Individual", paragraphs: ["Cada contribuyente recibe la parte resultante de dividir el importe entre quienes tienen derecho respecto de la misma familia o persona."] },
        { title: "Colectiva", paragraphs: ["Participan todos los posibles beneficiarios. Se entiende cedido el derecho al primer solicitante, quien recibe el abono y consigna deducción y pagos en su Renta."] },
        { title: "Cambio de modalidad", paragraphs: ["Solo puede realizarse en enero para cada deducción. No debe repetirse la solicitud anual si no se cambia de modalidad y se mantiene el derecho."] },
      ],
    },
    {
      id: "model-143-changes",
      title: "Errores, variaciones e incompatibilidades",
      cards: [
        { title: "Variaciones", paragraphs: ["Fallecimiento, baja, residencia, renuncia, cambio de régimen o mutualidad y pérdida de requisitos deben revisarse y comunicarse en los 15 días naturales siguientes cuando corresponda."] },
        { title: "Error en la solicitud inicial", paragraphs: ["La FAQ oficial distingue el dato erróneo de una variación: para corregir una solicitud inicial errónea indica darla de baja y presentar una nueva con los datos correctos."] },
        { title: "Compatibilidades", paragraphs: ["Familia numerosa y ascendiente con dos hijos son incompatibles entre sí. Las deducciones por discapacidad pueden ser compatibles en los términos legales."] },
      ],
    },
    {
      id: "model-143-renta",
      title: "Relación con Renta y Modelo 122",
      cards: [
        { title: "Modelo 100", paragraphs: ["La declaración anual determina el derecho definitivo y resta los abonos anticipados recibidos."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
        { title: "Modelo 122", paragraphs: ["Solo regulariza excesos de estas deducciones cuando el contribuyente no está obligado a presentar Renta. Quien declara regulariza en su Modelo 100."], links: [{ label: "Ver Modelo 122", href: "/consultor-fiscal/modelos/122" }] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 143",
  fillingSteps: [
    { title: "1. Separa cada deducción", paragraphs: ["Identifica familia numerosa, cada persona con discapacidad, ascendiente con dos hijos o cónyuge con discapacidad. No combines derechos distintos en una sola solicitud."] },
    { title: "2. Comprueba requisitos", paragraphs: ["Revisa NIF, título o certificado, mínimos familiares, rentas y alta, cotización o prestación aplicable."] },
    { title: "3. Elige modalidad", paragraphs: ["Acordad solicitud individual o colectiva con todos los contribuyentes con derecho antes de presentar."] },
    { title: "4. Presenta por el canal oficial", paragraphs: ["Usa presentación electrónica o el formulario de presolicitud disponible en la sede de la AEAT."] },
    { title: "5. Conserva y revisa", paragraphs: ["Guarda el justificante, controla los abonos y comunica cualquier variación dentro de plazo."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Tramitación", description: "La AEAT comprueba la solicitud y, si procede, realiza el abono mensual." },
    { title: "Cambios", description: "Las variaciones que afectan al derecho se comunican dentro de los 15 días naturales." },
    { title: "Renta", description: "El derecho definitivo y los anticipos se concilian en la declaración anual." },
  ],
  comparison: {
    title: "Modelo 143, Modelo 100 y Modelo 122",
    current: { title: "Modelo 143", description: "Solicita el abono anticipado de determinadas deducciones familiares." },
    related: { title: "Modelo 100", description: "Calcula el derecho anual definitivo y descuenta los anticipos.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    additional: [{ title: "Modelo 122", description: "Regulariza un exceso únicamente cuando quien lo percibió no está obligado a declarar.", href: "/consultor-fiscal/modelos/122", label: "Ver Modelo 122" }],
    conclusion: "El 143 anticipa; el 100 concilia a quien declara y el 122 cubre la regularización excepcional de quien no declara.",
  },
  pdfNotice: ["La AEAT ofrece presentación electrónica y presolicitud. Imprimir o guardar el formulario no equivale a completar el trámite."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-143.procedure-record.2026-03-02" },
    { label: "Preguntas frecuentes oficiales", sourceId: "aeat.model-143.faq.2026-03-25" },
    { label: "Ayuda de presentación electrónica", sourceId: "aeat.model-143.electronic-help.2026-06-19" },
    { label: "Ayuda del formulario de presolicitud", sourceId: "aeat.model-143.presolicitud-help.2026-04-09" },
  ],
  legalLinks: [
    { label: "Ley del IRPF · artículo 81 bis", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a81bis" },
    { label: "Reglamento del IRPF · artículo 60 bis", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a60bis" },
    { label: "Orden HAP/2486/2014", sourceId: "boe.model-143.order-hap-2486-2014" },
    { label: "Orden HAC/763/2018", sourceId: "boe.order-hac-763-2018" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 143?", answer: "La solicitud de abono anticipado de determinadas deducciones familiares del artículo 81 bis del IRPF." },
    { question: "¿Puede solicitarlo un autónomo?", answer: "Sí, si cumple el derecho familiar y el requisito de alta y cotización; para RETA, con carácter general, se comprueban al menos 15 días de alta en el mes." },
    { question: "¿Qué deducciones incluye?", answer: "Familia numerosa, ascendientes o descendientes con discapacidad, ascendiente con dos hijos y cónyuge no separado con discapacidad, con requisitos propios." },
    { question: "¿Cuánto se anticipa?", answer: "Generalmente hasta 100 euros mensuales por deducción, 200 para familia numerosa especial y 50 por cada hijo adicional." },
    { question: "¿Estar apuntado al paro es suficiente?", answer: "No. La excepción exige percibir una prestación contributiva o asistencial, no solo estar inscrito como demandante." },
    { question: "¿Qué diferencia hay entre solicitud individual y colectiva?", answer: "La individual reparte el abono entre beneficiarios; la colectiva cede el derecho al primer solicitante." },
    { question: "¿Se puede cambiar de modalidad durante el año?", answer: "Solo en enero respecto de cada deducción." },
    { question: "¿Hay que presentar una solicitud cada enero?", answer: "No, salvo que se quiera cambiar la modalidad o exista otra causa que exija una nueva solicitud." },
    { question: "¿Cuántas solicitudes se presentan por discapacidad?", answer: "Una por cada ascendiente o descendiente con discapacidad que genere el derecho." },
    { question: "¿Cuándo se comunica una variación?", answer: "Dentro de los 15 días naturales siguientes cuando el cambio afecta al cobro o se incumple un requisito." },
    { question: "¿Cómo corrijo un dato inicial erróneo?", answer: "La FAQ oficial indica dar de baja la solicitud errónea y presentar una nueva con los datos correctos." },
    { question: "¿Cómo se regulariza un cobro superior al derecho?", answer: "Quien presenta Renta lo ajusta en el Modelo 100; quien no está obligado puede necesitar el Modelo 122." },
  ],
  sourceIds: [
    "aeat.model-143.procedure-home.2026-03-25",
    "aeat.model-143.procedure-record.2026-03-02",
    "aeat.model-143.electronic-help.2026-06-19",
    "aeat.model-143.presolicitud-help.2026-04-09",
    "aeat.model-143.faq.2026-03-25",
    "boe.model-143.order-hap-2486-2014",
    "boe.order-hac-763-2018",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
