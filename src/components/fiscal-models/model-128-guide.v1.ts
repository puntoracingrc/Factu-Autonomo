import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_128_GUIDE_V1 = {
  code: "128",
  editorialCategory: "Retenciones e información financiera especializada",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 128 es la autoliquidación periódica de determinadas retenciones e ingresos a cuenta sobre rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguro de vida o invalidez.",
    "Lo presenta la entidad aseguradora, pagadora o retenedora obligada. El tomador, asegurado o beneficiario puede ser perceptor de la renta, pero normalmente no presenta el 128 por cobrar la prestación. El detalle anual se informa mediante el Modelo 188.",
  ],
  notices: [
    { title: "No todo seguro genera una renta incluida", paragraphs: ["Debe existir una operación de capitalización o una prestación de seguro incluida y una obligación de retener. La prima, el rescate y la indemnización no se clasifican automáticamente igual."] },
    { title: "Referencia de 2026 sujeta a revisión", paragraphs: ["El 19 % es una orientación general para determinados rendimientos. La tributación depende del producto, la prestación, la residencia y las reglas vigentes."] },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 128", sourceId: "aeat.model-128.procedure-home.2026-06-09", primary: true },
    { label: "Consultar la guía censal oficial", sourceId: "aeat.model-128.census-guide.2026-03-26", primary: true },
    { label: "Consultar la ficha del procedimiento", sourceId: "aeat.model-128.procedure-record.2026-06-09" },
  ],
  quickSummaryTitle: "El Modelo 128 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una autoliquidación periódica de determinadas retenciones sobre capitalización y seguros." },
    { label: "Quién lo presenta", value: "La entidad obligada a retener, no el beneficiario ordinario de la prestación." },
    { label: "Productos", value: "Operaciones de capitalización y contratos de seguro de vida o invalidez incluidos." },
    { label: "Periodicidad", value: "Normalmente trimestral; mensual para obligados mensuales." },
    { label: "Resumen anual", value: "Modelo 188." },
    { label: "Referencia 2026", value: "Orientación general del 19 %, con revisión anual y del producto concreto." },
  ],
  sections: [
    { id: "model-128-roles", title: "Quién retiene y quién recibe", cards: [
      { title: "Entidad declarante", paragraphs: ["La aseguradora o entidad pagadora presenta cuando la normativa le atribuye la obligación de practicar e ingresar la retención."] },
      { title: "Perceptor", paragraphs: ["Tomador, asegurado o beneficiario puede recibir la prestación y soportar la retención, pero normalmente no presenta el modelo."] },
    ] },
    { id: "model-128-products", title: "Productos y operaciones", cards: [
      { title: "Operaciones de capitalización", paragraphs: ["Productos en los que una aportación genera una prestación o renta de capital mobiliario conforme a su régimen fiscal."] },
      { title: "Seguros de vida", paragraphs: ["Determinadas prestaciones, rescates o vencimientos pueden originar rendimientos incluidos, según contrato y beneficiario."] },
      { title: "Seguros de invalidez", paragraphs: ["La denominación oficial los incluye, sin que toda indemnización quede automáticamente sujeta a retención."] },
    ] },
    { id: "model-128-boundaries", title: "Relación con otras declaraciones", cards: [
      { title: "Modelo 188", paragraphs: ["Resume anualmente perceptores, rentas y retenciones relacionadas con los periodos 128."], links: [{ label: "Ver Modelo 188", href: "/consultor-fiscal/modelos/188" }] },
      { title: "Modelo 189", paragraphs: ["Informa sobre determinados valores, seguros y rentas, con datos de posición y otra finalidad."], links: [{ label: "Ver Modelo 189", href: "/consultor-fiscal/modelos/189" }] },
      { title: "Modelo 280", paragraphs: ["Declaración informativa anual específica de Planes de Ahorro a Largo Plazo."], links: [{ label: "Ver Modelo 280", href: "/consultor-fiscal/modelos/280" }] },
    ] },
  ],
  fillingTitle: "Cómo preparar el Modelo 128",
  fillingSteps: [
    { title: "1. Identifica el contrato", paragraphs: ["Distingue capitalización, seguro de vida o seguro de invalidez y localiza sus condiciones fiscales."] },
    { title: "2. Identifica a las partes", paragraphs: ["Separa entidad pagadora, tomador, asegurado y beneficiario."] },
    { title: "3. Clasifica la prestación", paragraphs: ["Determina si existe renta sometida a retención y en qué momento nace."] },
    { title: "4. Revisa base y tipo", paragraphs: ["Aplica las reglas de 2026 al producto concreto y documenta exenciones o especialidades."] },
    { title: "5. Concilia con el 188", paragraphs: ["Conserva el detalle por perceptor y contrato para el resumen anual."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Justificante", description: "Conserva la presentación y la evidencia del ingreso." },
    { title: "Información al perceptor", description: "Facilita el certificado o información fiscal correspondiente." },
    { title: "Resumen anual", description: "Concilia contratos, prestaciones y retenciones con el Modelo 188." },
  ],
  comparison: {
    title: "Modelo 128 y Modelo 188",
    current: { title: "Modelo 128", description: "Ingreso periódico de determinadas retenciones sobre capitalización y seguros." },
    related: { title: "Modelo 188", description: "Resumen anual informativo de perceptores, rentas y retenciones.", href: "/consultor-fiscal/modelos/188", label: "Ver Modelo 188" },
    additional: [
      { title: "Modelo 189", description: "Determinada información anual sobre valores, seguros y rentas.", href: "/consultor-fiscal/modelos/189", label: "Ver Modelo 189" },
      { title: "Modelo 280", description: "Información anual específica de Planes de Ahorro a Largo Plazo.", href: "/consultor-fiscal/modelos/280", label: "Ver Modelo 280" },
    ],
    conclusion: "El 128 ingresa retenciones por periodos; el 188 informa anualmente de las rentas y perceptores relacionados.",
  },
  pdfNotice: ["La AEAT enlaza un diseño vigente en hoja de cálculo. El PDF de 2016 registrado es histórico y no debe tratarse como impreso actual."],
  documents: [],
  officialLinks: [
    { label: "Diseños de registro de los modelos 100 al 199", sourceId: "aeat.models-100-199.register-designs.2026-07-08" },
    { label: "Ayuda para consultar declaraciones", sourceId: "aeat.declarations-query-help.2026-05-07" },
  ],
  legalLinks: [
    { label: "Orden EHA/3435/2007", sourceId: "boe.order-eha-3435-2007" },
    { label: "Orden HAP/2194/2013", sourceId: "boe.order-hap-2194-2013" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 128?", answer: "Una autoliquidación de determinadas retenciones sobre operaciones de capitalización y seguros de vida o invalidez." },
    { question: "¿Quién lo presenta?", answer: "La aseguradora o entidad obligada a retener, no el beneficiario por el mero hecho de cobrar." },
    { question: "¿Cualquier seguro de vida se incluye?", answer: "No. Debe analizarse la prestación, el contrato y la existencia de una renta sometida a retención." },
    { question: "¿Incluye seguros de invalidez?", answer: "La denominación oficial los menciona, pero no toda indemnización queda automáticamente sujeta." },
    { question: "¿Cuál es el tipo en 2026?", answer: "El 19 % es una referencia general para determinados rendimientos y debe comprobarse para el producto concreto." },
    { question: "¿Es trimestral o mensual?", answer: "Normalmente trimestral; determinados obligados presentan mensualmente." },
    { question: "¿Qué relación tiene con el 188?", answer: "El 128 ingresa las retenciones y el 188 las resume anualmente con detalle de perceptores." },
    { question: "¿Qué diferencia hay con el 189?", answer: "El 189 informa de determinados valores, seguros y rentas con una finalidad y campos distintos." },
    { question: "¿Qué es el Modelo 280?", answer: "La declaración informativa anual específica de Planes de Ahorro a Largo Plazo." },
    { question: "¿El diseño histórico es vigente?", answer: "No. Debe utilizarse la documentación vigente enlazada por la AEAT." },
    { question: "¿Cómo se corrige un error?", answer: "Debe revisarse el periodo 128 y, si procede, el resumen anual 188 relacionado." },
    { question: "¿Factu tramita el rescate?", answer: "No. La ficha solo ofrece información y enlaces externos oficiales." },
  ],
  sourceIds: [
    "aeat.model-128.procedure-home.2026-06-09",
    "aeat.model-128.procedure-record.2026-06-09",
    "aeat.model-128.census-guide.2026-03-26",
    "aeat.models-100-199.register-designs.2026-07-08",
    "aeat.declarations-query-help.2026-05-07",
    "boe.order-eha-3435-2007",
    "boe.order-hap-2194-2013",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
