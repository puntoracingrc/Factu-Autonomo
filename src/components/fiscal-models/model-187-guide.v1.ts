import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_187_GUIDE_V1 = {
  code: "187",
  editorialCategory: "Retenciones e información financiera especializada",
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 187 es la declaración informativa anual que detalla acciones y participaciones de instituciones de inversión colectiva, las operaciones de transmisión o reembolso y determinadas transmisiones de derechos de suscripción, junto con las retenciones relacionadas.",
    "Lo presenta la entidad obligada a suministrar la información. La persona inversora aparece como perceptor o partícipe, pero no presenta el 187 por el mero hecho de invertir o reembolsar sus participaciones.",
  ],
  notices: [
    { title: "Es informativo: no vuelve a ingresar la retención", paragraphs: ["Los ingresos periódicos se efectúan mediante el Modelo 117. El 187 identifica anualmente operaciones y perceptores; corregir uno no modifica automáticamente el otro."] },
    { title: "La campaña cambia cada ejercicio", paragraphs: ["Para la información de 2025, la AEAT publicó el periodo del 1 de enero al 2 de febrero de 2026. Es un ejemplo versionado de esa campaña, no una fecha fija para años futuros."] },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 187", sourceId: "aeat.model-187.procedure-home.2026-07-08", primary: true },
    { label: "Consultar ayuda del formulario web", sourceId: "aeat.model-187.browser-form-help.2026-06-19", primary: true },
    { label: "Consultar los plazos oficiales", href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-187-decla_____s-reembolsos-esas-participaciones_/plazos-presentacion.html" },
  ],
  quickSummaryTitle: "El Modelo 187 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa anual; no genera un segundo ingreso de retenciones." },
    { label: "Quién lo presenta", value: "La entidad obligada a informar sobre las operaciones, no el inversor ordinario." },
    { label: "Qué detalla", value: "IIC, operaciones, perceptores, importes y retenciones conforme al diseño vigente." },
    { label: "Relación periódica", value: "Modelo 117, que ingresa las retenciones durante el año." },
    { label: "Plazo general", value: "Durante enero del año siguiente, comprobando siempre la campaña concreta." },
    { label: "Campaña 2025", value: "Del 1 de enero al 2 de febrero de 2026, como referencia versionada." },
  ],
  sections: [
    {
      id: "model-187-roles",
      title: "Declarante, partícipe y perceptor",
      cards: [
        { title: "Entidad declarante", paragraphs: ["La gestora, comercializadora, depositaria o intermediaria informa cuando la normativa le atribuye esa obligación."] },
        { title: "Persona inversora", paragraphs: ["Figura identificada en los registros de las operaciones. Recibe su certificado o información fiscal, pero normalmente no presenta el 187."] },
      ],
      note: "La condición de declarante depende del papel jurídico en la operación, no de quién consulta la ficha ni de quién es titular económico.",
    },
    {
      id: "model-187-content",
      title: "Qué información reúne",
      cards: [
        { title: "Operaciones sobre IIC", paragraphs: ["Transmisiones y reembolsos de acciones o participaciones y los datos de identificación exigidos por el diseño anual."] },
        { title: "Derechos de suscripción", paragraphs: ["La denominación oficial incluye las operaciones contempladas sobre derechos de suscripción."] },
        { title: "Retenciones", paragraphs: ["El resumen anual debe explicar las retenciones ingresadas periódicamente mediante el 117."], links: [{ label: "Ver Modelo 117", href: "/consultor-fiscal/modelos/117" }] },
      ],
    },
    {
      id: "model-187-neighbours",
      title: "Modelos financieros cercanos",
      cards: [
        { title: "Modelo 189", paragraphs: ["Informa anualmente sobre determinados valores, seguros y rentas, con una finalidad distinta al detalle de operaciones del 187."], links: [{ label: "Ver Modelo 189", href: "/consultor-fiscal/modelos/189" }] },
        { title: "Modelo 198", paragraphs: ["Recoge otras operaciones con activos financieros y valores mobiliarios que no deben trasladarse automáticamente al 187."], links: [{ label: "Ver Modelo 198", href: "/consultor-fiscal/modelos/198" }] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 187",
  fillingSteps: [
    { title: "1. Reúne los periodos 117", paragraphs: ["Incluye autoliquidaciones, correcciones, operaciones y justificantes del ejercicio."] },
    { title: "2. Identifica cada operación", paragraphs: ["Distingue transmisión, reembolso y derechos de suscripción conforme al diseño aplicable."] },
    { title: "3. Valida perceptores", paragraphs: ["Comprueba NIF, residencia, titularidad y demás datos exigidos sin completar ausencias por inferencia."] },
    { title: "4. Concilia importes", paragraphs: ["Explica las diferencias entre registros, retenciones, certificados y contabilidad."] },
    { title: "5. Presenta por el canal adecuado", paragraphs: ["Usa el formulario o el fichero oficial según el volumen y conserva la respuesta de la AEAT."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Respuesta oficial", description: "Revisa registros aceptados o rechazados y conserva el justificante." },
    { title: "Información al inversor", description: "Facilita el certificado o la información fiscal que corresponda." },
    { title: "Rectificación coherente", description: "Coordina cualquier cambio del 187 con los periodos 117 afectados." },
  ],
  comparison: {
    title: "Modelo 187 y Modelo 117",
    current: { title: "Modelo 187", description: "Detalle anual informativo por operación y perceptor." },
    related: { title: "Modelo 117", description: "Autoliquidación periódica que ingresa determinadas retenciones.", href: "/consultor-fiscal/modelos/117", label: "Ver Modelo 117" },
    additional: [
      { title: "Modelo 189", description: "Posiciones y otros datos anuales sobre valores, seguros y rentas.", href: "/consultor-fiscal/modelos/189", label: "Ver Modelo 189" },
      { title: "Modelo 198", description: "Otras operaciones anuales con activos financieros y valores mobiliarios.", href: "/consultor-fiscal/modelos/198", label: "Ver Modelo 198" },
    ],
    conclusion: "El 117 ingresa durante el año; el 187 detalla anualmente quién intervino y qué operación se informó.",
  },
  pdfNotice: ["El diseño de registro es documentación técnica del ejercicio indicado. No es una declaración presentada ni sustituye la validación del fichero."],
  documents: [{ label: "Descargar diseño de registro del Modelo 187", sourceId: "aeat.model-187.register-design.pdf" }],
  officialLinks: [
    { label: "Ficha del procedimiento", sourceId: "aeat.model-187.procedure-record.2026-07-08" },
    { label: "Ayuda de presentación mediante fichero", sourceId: "aeat.model-187.file-upload-help.2026-06-19" },
  ],
  legalLinks: [
    { label: "Orden HAP/1608/2014", sourceId: "boe.model-187.order-hap-1608-2014" },
    { label: "Orden HFP/823/2022", sourceId: "boe.model-187.order-hfp-823-2022" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 187?", answer: "La declaración informativa anual de determinadas operaciones con acciones y participaciones de instituciones de inversión colectiva y derechos de suscripción." },
    { question: "¿Lo presenta el inversor?", answer: "Normalmente no. Lo presenta la entidad obligada a informar; el inversor figura como partícipe o perceptor." },
    { question: "¿Vuelve a pagar las retenciones?", answer: "No. Los ingresos periódicos se realizan mediante el Modelo 117." },
    { question: "¿Qué relación tiene con el 117?", answer: "El 117 agrupa e ingresa retenciones por periodos; el 187 aporta el detalle anual de operaciones y perceptores." },
    { question: "¿Cuándo se presenta?", answer: "Con carácter general durante enero del año siguiente, consultando la fecha exacta de cada campaña." },
    { question: "¿Qué plazo tuvo la información de 2025?", answer: "La campaña publicada fue del 1 de enero al 2 de febrero de 2026; no debe extrapolarse a otros ejercicios." },
    { question: "¿Qué diferencia hay con el Modelo 189?", answer: "El 187 detalla operaciones de IIC; el 189 informa sobre determinadas posiciones y datos anuales de valores, seguros y rentas." },
    { question: "¿Qué diferencia hay con el Modelo 198?", answer: "El 198 cubre otras operaciones con activos financieros y valores mobiliarios fuera del ámbito específico del 187." },
    { question: "¿Puedo usar el formulario web?", answer: "La AEAT publica formulario web y presentación mediante fichero; debe elegirse el canal admitido para el volumen y ejercicio." },
    { question: "¿Un fichero validado ya está presentado?", answer: "No. La presentación termina con el envío y la respuesta oficial, que puede aceptar o rechazar registros." },
    { question: "¿Cómo se corrigen discrepancias?", answer: "Debe corregirse el registro anual y revisar también los Modelos 117 del ejercicio que resulten afectados." },
    { question: "¿Factu envía los registros?", answer: "No. La ficha informa y enlaza a la sede oficial; no transmite datos financieros." },
  ],
  sourceIds: [
    "aeat.model-187.procedure-home.2026-07-08",
    "aeat.model-187.procedure-record.2026-07-08",
    "aeat.model-187.browser-form-help.2026-06-19",
    "aeat.model-187.file-upload-help.2026-06-19",
    "aeat.model-187.register-design.pdf",
    "boe.model-187.order-hap-1608-2014",
    "boe.model-187.order-hfp-823-2022",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
