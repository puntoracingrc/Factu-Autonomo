import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_140_GUIDE_V1 = {
  code: "140",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 140 permite solicitar el abono anticipado de la deducción por maternidad y comunicar las variaciones que afecten a ese cobro.",
    "La deducción puede alcanzar 1.200 euros anuales por cada hijo menor de tres años —100 euros por cada mes con derecho—. El derecho definitivo se comprueba en la declaración anual de la Renta.",
  ],
  notices: [
    {
      title: "El incremento por guardería no se solicita con el 140",
      paragraphs: [
        "El incremento adicional por gastos de custodia en guarderías o centros autorizados puede alcanzar 1.000 euros, pero se aplica en la declaración de la Renta. El centro informa mediante el Modelo 233; la familia no presenta ese modelo.",
      ],
    },
    {
      title: "Una solicitud por cada menor",
      paragraphs: [
        "Si ya se cobra el abono anticipado por el mismo hijo, la AEAT indica que no debe repetirse la solicitud en enero ni presentar otra mientras continúe el derecho. Las variaciones se gestionan en el trámite específico.",
      ],
    },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 140", sourceId: "aeat.model-140.procedure-home.2026-01-29", primary: true },
    { label: "Consultar la ayuda de presentación electrónica", sourceId: "aeat.model-140.electronic-help.2026-06-19", primary: true },
    { label: "Consultar la ayuda de predeclaración", sourceId: "aeat.model-140.predeclaration-help.2026-04-09" },
    { label: "Ver la declaración anual de Renta", internalHref: "/consultor-fiscal/modelos/100" },
  ],
  quickSummaryTitle: "El Modelo 140 en pocas palabras",
  quickFacts: [
    { label: "Qué solicita", value: "El pago mensual anticipado de la deducción por maternidad." },
    { label: "Cuantía general", value: "Hasta 100 € al mes y 1.200 € al año por cada hijo con derecho." },
    { label: "Edad", value: "Con carácter general, desde el nacimiento hasta el mes anterior a cumplir tres años." },
    { label: "Alta o prestación", value: "Desempleo contributivo o asistencial al nacer, o alta en Seguridad Social o mutualidad con los requisitos legales." },
    { label: "Variaciones", value: "Se comunican por el trámite de gestión dentro de los 15 días naturales cuando proceda." },
    { label: "Guardería", value: "El incremento se aplica en Renta; el centro presenta el Modelo 233." },
  ],
  sections: [
    {
      id: "model-140-beneficiaries",
      title: "Quién puede tener derecho",
      cards: [
        { title: "Madres con hijos menores de tres años", paragraphs: ["Deben tener derecho al mínimo por descendientes y cumplir los requisitos de prestación, alta y cotización establecidos en el artículo 81 de la Ley del IRPF."] },
        { title: "Nacimiento y desempleo", paragraphs: ["También se contempla que, en el momento del nacimiento, la madre perciba una prestación contributiva o asistencial del sistema de protección de desempleo."] },
        { title: "Alta posterior", paragraphs: ["Si el alta en Seguridad Social o mutualidad se produce después del nacimiento, la ley exige alcanzar al menos 30 días cotizados. En ese supuesto puede existir un incremento anual de 150 euros en el ejercicio en que se alcance el periodo, que se aplica en Renta y debe comprobarse para el caso concreto."] },
        { title: "Adopción, acogimiento y otros beneficiarios", paragraphs: ["Existen reglas específicas para adopción, delegación de guarda, acogimiento y para el padre, tutor u otra persona que pueda aplicar la deducción cuando concurran las circunstancias legales."] },
      ],
      note: "El Modelo 140 solicita el anticipo; no convierte por sí mismo a una persona en beneficiaria ni fija el derecho anual definitivo.",
    },
    {
      id: "model-140-amount",
      title: "Cuantía y meses con derecho",
      cards: [
        { title: "Importe mensual", paragraphs: ["El abono anticipado general es de 100 euros por cada mes en que se cumplan los requisitos y por cada hijo que genere el derecho."] },
        { title: "Máximo anual", paragraphs: ["La deducción alcanza hasta 1.200 euros por hijo y año. Nacimiento, tercer cumpleaños, adopción u otros cambios pueden reducir el número de meses."] },
        { title: "Varios contribuyentes", paragraphs: ["Si hay más de una persona con derecho respecto del mismo menor, el formulario identifica esa situación y cada beneficiario debe tramitar lo que le corresponda."] },
      ],
    },
    {
      id: "model-140-daycare",
      title: "Guardería y Modelo 233",
      cards: [
        { title: "Incremento de hasta 1.000 euros", paragraphs: ["La deducción por maternidad puede incrementarse por gastos de custodia satisfechos a guarderías o centros de educación infantil autorizados, dentro de los límites legales."] },
        { title: "Se aplica en Renta", paragraphs: ["No se anticipa mediante el Modelo 140. Se comprueba y aplica en la declaración anual del Modelo 100."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
        { title: "El centro presenta el 233", paragraphs: ["La declaración informativa corresponde a la guardería o centro autorizado, no a madres, padres o tutores."], links: [{ label: "Ver Modelo 233", href: "/consultor-fiscal/modelos/233" }] },
      ],
    },
    {
      id: "model-140-changes",
      title: "Variaciones y bajas",
      cards: [
        { title: "Plazo general", paragraphs: ["Las variaciones que afecten al cobro anticipado deben comunicarse dentro de los 15 días naturales siguientes. Para solicitudes iniciadas desde marzo de 2020, la AEAT remite a Consulta y gestión de declaraciones presentadas."] },
        { title: "Cambios que se comunican", paragraphs: ["Entre otros, cambios de residencia, renuncia, cambio de régimen o mutualidad y situaciones que alteren el derecho o la cuenta de abono deben revisarse en el trámite oficial."] },
        { title: "Finalizaciones automáticas indicadas por la AEAT", paragraphs: ["La orden identifica supuestos que no requieren comunicación, como que el menor cumpla tres años, que finalice el periodo legal en adopción o acogimiento, el fallecimiento del beneficiario o del menor y determinadas bajas en Seguridad Social o mutualidad. Comprueba siempre el trámite vigente antes de omitir una comunicación."] },
      ],
    },
    {
      id: "model-140-renta",
      title: "Relación con la declaración de la Renta",
      cards: [
        { title: "Regularización anual", paragraphs: ["En el Modelo 100 se determina la deducción realmente generada y se descuentan los abonos anticipados recibidos."] },
        { title: "No uses el 122 para maternidad", paragraphs: ["El Modelo 122 regulariza determinadas deducciones del artículo 81 bis por no declarantes. No es el mecanismo general para devolver pagos del Modelo 140."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 140",
  fillingSteps: [
    { title: "1. Comprueba el derecho por cada menor", paragraphs: ["Revisa mínimo por descendientes, edad o periodo de adopción y el requisito de prestación, alta y cotización."] },
    { title: "2. Identifica al beneficiario", paragraphs: ["Comprueba si existe otra persona con derecho y reúne NIF y datos del menor sin facilitarlos a Factu."] },
    { title: "3. Elige el canal oficial", paragraphs: ["Puedes usar la presentación electrónica o el formulario de predeclaración que ofrece la AEAT."] },
    { title: "4. Revisa régimen, prestación e IBAN", paragraphs: ["La ayuda oficial pide comprobar cuidadosamente el régimen o mutualidad, la prestación correspondiente y la cuenta bancaria."] },
    { title: "5. Valida y conserva el justificante", paragraphs: ["Solo Firmar y enviar completa la presentación electrónica. Conserva el PDF y el Código Seguro de Verificación (CSV)."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Abono mensual", description: "La AEAT tramita la solicitud y, si procede, realiza el abono anticipado." },
    { title: "Variaciones", description: "Comunica a tiempo los cambios mediante Consulta y gestión de declaraciones presentadas." },
    { title: "Renta anual", description: "Comprueba el derecho definitivo y los pagos recibidos en el Modelo 100." },
  ],
  comparison: {
    title: "Modelo 140, Modelo 100 y Modelo 233",
    current: { title: "Modelo 140", description: "Solicita el abono anticipado de la deducción por maternidad." },
    related: { title: "Modelo 100", description: "Calcula la deducción anual definitiva y el incremento por guardería.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    additional: [{ title: "Modelo 233", description: "Lo presenta la guardería o centro autorizado para informar de los gastos de custodia.", href: "/consultor-fiscal/modelos/233", label: "Ver Modelo 233" }],
    conclusion: "El 140 anticipa la deducción general; la Renta la comprueba y aplica el incremento de guardería con la información del 233.",
  },
  pdfNotice: ["El Modelo 140 se cumplimenta en los servicios actuales de la AEAT. La predeclaración genera el documento para su presentación; guardar un PDF no equivale a presentar."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-140.procedure-record.2026-03-25" },
    { label: "Ayuda de presentación electrónica", sourceId: "aeat.model-140.electronic-help.2026-06-19" },
    { label: "Ayuda del formulario de predeclaración", sourceId: "aeat.model-140.predeclaration-help.2026-04-09" },
  ],
  legalLinks: [
    { label: "Ley del IRPF · artículo 81", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a81" },
    { label: "Reglamento del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820" },
    { label: "Orden HAC/177/2020", sourceId: "boe.model-140.order-hac-177-2020" },
    { label: "Orden HFP/1336/2022", sourceId: "boe.order-hfp-1336-2022" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 140?", answer: "La solicitud del abono anticipado de la deducción por maternidad y el cauce para gestionar variaciones." },
    { question: "¿Cuánto se cobra?", answer: "Con carácter general, hasta 100 euros por mes con derecho y 1.200 euros al año por cada hijo." },
    { question: "¿Hay que renovarlo cada enero?", answer: "No. Si ya se cobra por el mismo hijo y se mantienen los requisitos, la AEAT indica que no debe repetirse la solicitud." },
    { question: "¿Puede solicitarlo una autónoma?", answer: "Sí, si cumple los requisitos del artículo 81, incluido el alta o la prestación y, cuando proceda, el periodo mínimo de cotización." },
    { question: "¿Qué ocurre si el alta es posterior al nacimiento?", answer: "Debe alcanzarse el mínimo legal de 30 días cotizados; el derecho y el posible incremento se comprueban en Renta." },
    { question: "¿Incluye adopción o acogimiento?", answer: "Sí, con reglas específicas sobre beneficiario y duración que deben comprobarse para el caso concreto." },
    { question: "¿Cómo se solicita?", answer: "Por presentación electrónica o mediante la predeclaración ofrecida por la AEAT." },
    { question: "¿Cómo comunico una variación?", answer: "Mediante el trámite de consulta y gestión, normalmente dentro de los 15 días naturales siguientes al cambio." },
    { question: "¿La guardería se solicita en el 140?", answer: "No. El incremento por custodia se aplica en Renta y el centro informa mediante el Modelo 233." },
    { question: "¿Debo presentar yo el Modelo 233?", answer: "No. Corresponde a la guardería o centro de educación infantil autorizado." },
    { question: "¿Cómo se ajusta lo cobrado?", answer: "La declaración anual de la Renta calcula el derecho definitivo y descuenta los abonos anticipados." },
    { question: "¿El Modelo 122 regulariza la maternidad?", answer: "No es el mecanismo general del Modelo 140; el 122 se refiere a deducciones familiares del artículo 81 bis de no declarantes." },
  ],
  sourceIds: [
    "aeat.model-140.procedure-home.2026-01-29",
    "aeat.model-140.procedure-record.2026-03-25",
    "aeat.model-140.electronic-help.2026-06-19",
    "aeat.model-140.predeclaration-help.2026-04-09",
    "boe.model-140.order-hac-177-2020",
    "boe.order-hfp-1336-2022",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
