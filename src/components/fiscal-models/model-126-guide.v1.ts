import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_126_GUIDE_V1 = {
  code: "126",
  editorialCategory: "Retenciones e información financiera especializada",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 126 es la autoliquidación periódica de determinadas retenciones e ingresos a cuenta sobre rendimientos obtenidos por la contraprestación derivada de cuentas en toda clase de instituciones financieras.",
    "Lo presenta la institución o entidad obligada a retener. El titular que cobra intereses o rendimientos de su cuenta soporta la retención cuando procede, pero normalmente no presenta el 126. La información relacionada se recoge en el Modelo 196.",
  ],
  notices: [
    { title: "Ser titular de una cuenta no convierte en declarante", paragraphs: ["La obligación del 126 corresponde al retenedor. El titular conserva su certificado o información fiscal y declara sus rendimientos en el impuesto que corresponda."] },
    { title: "Referencia del 19 % para 2026", paragraphs: ["Es una orientación general sujeta a revisión anual. Deben comprobarse residencia, naturaleza de la cuenta, exenciones y cualquier régimen especial."] },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 126", sourceId: "aeat.model-126.procedure-home.2026-02-13", primary: true },
    { label: "Consultar la guía censal oficial", sourceId: "aeat.model-126.census-guide.2026-03-26", primary: true },
    { label: "Consultar la ficha del procedimiento", sourceId: "aeat.model-126.procedure-record.2026-06-09" },
  ],
  quickSummaryTitle: "El Modelo 126 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una autoliquidación periódica de retenciones sobre rendimientos de cuentas financieras." },
    { label: "Quién lo presenta", value: "La entidad obligada a retener, no el titular ordinario de la cuenta." },
    { label: "Ámbito", value: "Contraprestaciones derivadas de cuentas en instituciones financieras, incluidas determinadas cuentas basadas en activos financieros." },
    { label: "Periodicidad", value: "Generalmente trimestral; mensual para obligados mensuales." },
    { label: "Información relacionada", value: "Modelo 196." },
    { label: "Referencia 2026", value: "Orientación general del 19 %, con revisión del supuesto y del ejercicio." },
  ],
  sections: [
    { id: "model-126-roles", title: "Entidad declarante y titular de la cuenta", cards: [
      { title: "Entidad retenedora", paragraphs: ["La institución financiera calcula e ingresa la retención cuando la normativa le atribuye esa obligación."] },
      { title: "Titular o perceptor", paragraphs: ["Recibe el rendimiento neto y la información fiscal; normalmente no presenta el 126 por su cuenta."] },
    ] },
    { id: "model-126-scope", title: "Qué cuentas y rendimientos abarca", cards: [
      { title: "Cuentas remuneradas", paragraphs: ["Cuentas corrientes, de ahorro, imposiciones y otras cuentas pueden generar rendimientos incluidos, según su naturaleza."] },
      { title: "Cuentas basadas en activos", paragraphs: ["La guía censal menciona también cuentas basadas en operaciones sobre activos financieros."] },
      { title: "Otros productos", paragraphs: ["Operaciones sobre activos de deuda, fondos o seguros disponen de modelos específicos."], links: [
        { label: "Ver Modelo 124", href: "/consultor-fiscal/modelos/124" },
        { label: "Ver Modelo 117", href: "/consultor-fiscal/modelos/117" },
        { label: "Ver Modelo 128", href: "/consultor-fiscal/modelos/128" },
      ] },
    ] },
    { id: "model-126-reconcile", title: "Del ingreso periódico a la información de cuentas", cards: [
      { title: "Durante el año", paragraphs: ["El 126 ingresa las retenciones agregadas del periodo."] },
      { title: "Información de cuentas", paragraphs: ["El Modelo 196 identifica cuentas, declarados y datos adicionales conforme a la periodicidad vigente."], links: [{ label: "Ver Modelo 196", href: "/consultor-fiscal/modelos/196" }] },
    ], note: "Desde enero de 2026 el Modelo 196 es mensual. Este cambio no convierte el 126 en una declaración informativa ni sustituye sus ingresos periódicos." },
  ],
  fillingTitle: "Cómo preparar el Modelo 126",
  fillingSteps: [
    { title: "1. Delimita las cuentas", paragraphs: ["Identifica productos, titulares y rendimientos del periodo."] },
    { title: "2. Determina el retenedor", paragraphs: ["Comprueba qué entidad está obligada a ingresar y qué persona es perceptora."] },
    { title: "3. Revisa periodo y exigibilidad", paragraphs: ["Sitúa el rendimiento en el periodo correcto y confirma la periodicidad del declarante."] },
    { title: "4. Calcula con la regla vigente", paragraphs: ["Valida base, tipo, residencia y excepciones para 2026."] },
    { title: "5. Concilia con el 196", paragraphs: ["Mantén trazabilidad entre cuentas, rendimientos, retenciones y comunicaciones informativas."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Justificante", description: "Conserva la presentación y la referencia del pago o deuda." },
    { title: "Certificados", description: "Facilita al titular la información fiscal que corresponda." },
    { title: "Conciliación", description: "Revisa que las retenciones sean coherentes con la información del Modelo 196." },
  ],
  comparison: {
    title: "Modelo 126 y Modelo 196",
    current: { title: "Modelo 126", description: "Autoliquidación periódica que ingresa retenciones sobre rendimientos de cuentas." },
    related: { title: "Modelo 196", description: "Declaración informativa de cuentas; desde 2026 tiene periodicidad mensual.", href: "/consultor-fiscal/modelos/196", label: "Ver Modelo 196" },
    additional: [{ title: "Modelo 198", description: "Otras operaciones con activos financieros y valores mobiliarios.", href: "/consultor-fiscal/modelos/198", label: "Ver Modelo 198" }],
    conclusion: "El 126 ingresa retenciones; el 196 suministra el detalle informativo de cuentas y personas relacionadas.",
  },
  pdfNotice: ["La AEAT enlaza un diseño vigente en hoja de cálculo. El PDF de 2016 registrado es histórico y no un formulario actual."],
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
    { question: "¿Qué es el Modelo 126?", answer: "Una autoliquidación de determinadas retenciones sobre rendimientos derivados de cuentas en instituciones financieras." },
    { question: "¿Quién lo presenta?", answer: "La entidad obligada a retener; el titular ordinario de la cuenta no lo presenta por cobrar intereses." },
    { question: "¿Incluye solo cuentas bancarias?", answer: "La denominación abarca cuentas en toda clase de instituciones financieras y la guía menciona determinadas cuentas basadas en activos financieros." },
    { question: "¿Cuál es el tipo en 2026?", answer: "El 19 % es una referencia general, pero deben revisarse producto, residencia y excepciones." },
    { question: "¿Es trimestral o mensual?", answer: "Normalmente trimestral; determinados obligados presentan mensualmente." },
    { question: "¿Qué diferencia hay con el Modelo 124?", answer: "El 124 se vincula a operaciones sobre activos de deuda; el 126 a rendimientos derivados de cuentas." },
    { question: "¿Qué relación tiene con el Modelo 196?", answer: "El 126 ingresa retenciones y el 196 suministra información detallada sobre cuentas y personas relacionadas." },
    { question: "¿El 196 mensual sustituye al 126?", answer: "No. Son obligaciones de naturaleza distinta: informativa y de ingreso de retenciones." },
    { question: "¿El diseño histórico es vigente?", answer: "No. Debe usarse la documentación vigente enlazada por la AEAT." },
    { question: "¿Hay presentación por lotes?", answer: "Sí. La sede oficial publica presentación individual, por lotes y consulta." },
    { question: "¿Cómo se corrige un error?", answer: "Debe revisarse el periodo 126 afectado y su conciliación con la información de cuentas." },
    { question: "¿Factu accede a mi cuenta bancaria?", answer: "No. Esta ficha pública no solicita ni almacena datos financieros." },
  ],
  sourceIds: [
    "aeat.model-126.procedure-home.2026-02-13",
    "aeat.model-126.procedure-record.2026-06-09",
    "aeat.model-126.census-guide.2026-03-26",
    "aeat.models-100-199.register-designs.2026-07-08",
    "aeat.declarations-query-help.2026-05-07",
    "boe.order-eha-3435-2007",
    "boe.order-hap-2194-2013",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
