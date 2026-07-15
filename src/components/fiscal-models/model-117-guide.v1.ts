import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_117_GUIDE_V1 = {
  code: "117",
  editorialCategory: "Retenciones e información financiera especializada",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 117 es la autoliquidación periódica con la que el retenedor ingresa determinadas retenciones ligadas a transmisiones o reembolsos de acciones y participaciones en instituciones de inversión colectiva, como fondos de inversión, y a determinadas transmisiones de derechos de suscripción.",
    "Lo presenta la entidad obligada a retener o ingresar a cuenta. La persona inversora soporta la retención, pero normalmente no presenta el 117 por su reembolso. El detalle anual de las operaciones se comunica mediante el Modelo 187.",
  ],
  notices: [
    {
      title: "Distingue al retenedor de la persona inversora",
      paragraphs: [
        "Tener participaciones en un fondo, venderlas o solicitar un reembolso no convierte por sí solo al inversor en declarante del Modelo 117. La obligación recae en quien interviene como retenedor según la operación.",
      ],
    },
    {
      title: "Porcentajes y supuestos con revisión anual",
      paragraphs: [
        "La referencia general del 19 % se sitúa en el ejercicio 2026 y no debe reutilizarse como regla permanente. Antes de calcular hay que comprobar la operación, la residencia, el régimen aplicable y el tipo vigente.",
      ],
    },
  ],
  actions: [
    {
      label: "Abrir gestiones oficiales del Modelo 117",
      sourceId: "aeat.model-117.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar la ficha del procedimiento",
      sourceId: "aeat.model-117.procedure-record.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar cuándo nace la retención",
      href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/retenciones-ingresos-cuenta/que-momento-tengo-que-realizar-cuenta.html",
    },
  ],
  quickSummaryTitle: "El Modelo 117 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una autoliquidación periódica de retenciones e ingresos a cuenta." },
    { label: "Quién lo presenta", value: "La entidad o persona obligada a retener, no el inversor por el mero hecho de ser partícipe." },
    { label: "Operaciones", value: "Transmisiones o reembolsos de acciones o participaciones de instituciones de inversión colectiva y determinados derechos de suscripción." },
    { label: "Periodicidad", value: "Con carácter general trimestral; mensual para obligados con periodicidad mensual." },
    { label: "Relación anual", value: "Modelo 187, que identifica operaciones y perceptores." },
    { label: "Referencia 2026", value: "El 19 % es una orientación general sujeta a comprobación y revisión anual." },
  ],
  sections: [
    {
      id: "model-117-roles",
      title: "Quién declara y quién recibe la renta",
      cards: [
        { title: "Declarante o retenedor", paragraphs: ["Suele ser la entidad gestora, comercializadora, depositaria o intermediaria a la que la normativa atribuye la obligación de retener e ingresar el importe."] },
        { title: "Inversor o perceptor", paragraphs: ["Es titular de las acciones o participaciones y soporta la retención cuando proceda. Conserva la información de la operación, pero normalmente no presenta este modelo."] },
      ],
      note: "La identidad del intermediario y la forma de comercialización pueden cambiar quién retiene. No debe inferirse solo por el nombre del fondo o del banco.",
    },
    {
      id: "model-117-scope",
      title: "Qué operaciones encajan y cuáles exigen otra ficha",
      cards: [
        { title: "Reembolso o transmisión de IIC", paragraphs: ["Comprende determinadas ganancias o rentas derivadas de acciones y participaciones de instituciones de inversión colectiva."] },
        { title: "Derechos de suscripción", paragraphs: ["La denominación oficial incluye determinadas transmisiones de derechos de suscripción. Debe comprobarse el supuesto concreto."] },
        { title: "Otros rendimientos financieros", paragraphs: ["Dividendos, intereses ordinarios, cuentas, activos de deuda y seguros disponen de modelos específicos."], links: [
          { label: "Ver Modelo 123", href: "/consultor-fiscal/modelos/123" },
          { label: "Ver Modelo 124", href: "/consultor-fiscal/modelos/124" },
          { label: "Ver Modelo 126", href: "/consultor-fiscal/modelos/126" },
          { label: "Ver Modelo 128", href: "/consultor-fiscal/modelos/128" },
        ] },
      ],
    },
    {
      id: "model-117-periods",
      title: "Periodo, retención y conciliación",
      cards: [
        { title: "Momento de la operación", paragraphs: ["Clasifica cada transmisión, reembolso o pago en el periodo en que nace la obligación de retener según la normativa aplicable."] },
        { title: "Cálculo revisable", paragraphs: ["Se parte del importe sometido a retención y del tipo vigente. La referencia del 19 % para 2026 no resuelve por sí sola la base ni las excepciones."] },
        { title: "Cierre anual", paragraphs: ["Los totales periódicos deben poder conciliarse con el detalle por operación y perceptor del Modelo 187."], links: [{ label: "Ver Modelo 187", href: "/consultor-fiscal/modelos/187" }] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 117",
  fillingSteps: [
    { title: "1. Delimita la operación", paragraphs: ["Confirma que se trata de una institución de inversión colectiva o de un derecho de suscripción incluido."] },
    { title: "2. Identifica al obligado", paragraphs: ["Determina quién actúa como retenedor y quién es el perceptor, sin intercambiar sus papeles."] },
    { title: "3. Sitúa el periodo", paragraphs: ["Comprueba la fecha relevante y si la periodicidad del declarante es trimestral o mensual."] },
    { title: "4. Revisa base y tipo", paragraphs: ["Aplica el porcentaje vigente al supuesto concreto y documenta cualquier excepción."] },
    { title: "5. Concilia y conserva", paragraphs: ["Contrasta operaciones, contabilidad, justificante oficial y datos que se incluirán en el 187."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Justificante", description: "Conserva la respuesta oficial y la referencia de pago o deuda." },
    { title: "Detalle anual", description: "Acumula las operaciones por perceptor para el Modelo 187." },
    { title: "Correcciones", description: "Corrige tanto el periodo afectado como el resumen anual cuando corresponda." },
  ],
  comparison: {
    title: "Modelo 117 y Modelo 187",
    current: { title: "Modelo 117", description: "Autoliquidación periódica que ingresa determinadas retenciones sobre IIC y derechos de suscripción." },
    related: { title: "Modelo 187", description: "Declaración informativa anual con el detalle de las operaciones y perceptores.", href: "/consultor-fiscal/modelos/187", label: "Ver Modelo 187" },
    additional: [{ title: "Modelo 189", description: "Información anual sobre determinados valores, seguros y rentas a 31 de diciembre.", href: "/consultor-fiscal/modelos/189", label: "Ver Modelo 189" }],
    conclusion: "El 117 ingresa periódicamente; el 187 explica anualmente las operaciones que originan esas retenciones.",
  },
  pdfNotice: ["La AEAT ofrece presentación electrónica y un diseño de registro. Un diseño técnico no es un impreso para firmar ni acredita la presentación."],
  documents: [],
  officialLinks: [
    { label: "Ayuda para consultar declaraciones", sourceId: "aeat.declarations-query-help.2026-05-07" },
    { label: "Diseños de registro de los modelos 100 al 199", sourceId: "aeat.models-100-199.register-designs.2026-07-08" },
  ],
  legalLinks: [{ label: "Orden EHA/3435/2007", sourceId: "boe.model-117.order-2007" }],
  faq: [
    { question: "¿Quién presenta el Modelo 117?", answer: "La entidad o persona a la que la normativa atribuye la condición de retenedor en la operación." },
    { question: "¿Lo presenta el inversor que reembolsa un fondo?", answer: "Normalmente no. El inversor soporta la retención y conserva la información, mientras el retenedor presenta el modelo." },
    { question: "¿Qué operaciones incluye?", answer: "Determinadas transmisiones o reembolsos de acciones o participaciones de instituciones de inversión colectiva y determinadas transmisiones de derechos de suscripción." },
    { question: "¿Cualquier venta de acciones va en el 117?", answer: "No. Debe tratarse de operaciones incluidas en su ámbito; otras operaciones con valores pueden corresponder al Modelo 198 u otro modelo." },
    { question: "¿Cuál es el tipo en 2026?", answer: "El 19 % es una referencia general para determinados supuestos, pero la base, la residencia y cualquier excepción deben verificarse." },
    { question: "¿Es trimestral o mensual?", answer: "Con carácter general es trimestral; determinados obligados presentan mensualmente." },
    { question: "¿Qué relación tiene con el Modelo 187?", answer: "El 117 ingresa totales periódicos y el 187 detalla anualmente las operaciones y perceptores." },
    { question: "¿Puedo confundirlo con el Modelo 123?", answer: "No. El 123 cubre determinadas rentas del capital mobiliario; el 117 tiene un ámbito específico de IIC y derechos de suscripción." },
    { question: "¿La AEAT ofrece presentación por lotes?", answer: "Sí. La página oficial reúne presentación individual, por lotes, consulta y aportación de documentación." },
    { question: "¿El diseño de registro es un formulario?", answer: "No. Es documentación técnica para estructurar datos y no sustituye el envío ni el justificante oficial." },
    { question: "¿Cómo se corrige un error?", answer: "Debe revisarse la autoliquidación del periodo y, si ya se presentó, también la coherencia del Modelo 187." },
    { question: "¿Factu presenta el modelo?", answer: "No. Esta ficha es informativa y los accesos abren la sede oficial en otra pestaña." },
  ],
  sourceIds: [
    "aeat.model-117.procedure-home.2026-06-09",
    "aeat.model-117.procedure-record.2026-06-09",
    "aeat.declarations-query-help.2026-05-07",
    "aeat.models-100-199.register-designs.2026-07-08",
    "boe.model-117.order-2007",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
