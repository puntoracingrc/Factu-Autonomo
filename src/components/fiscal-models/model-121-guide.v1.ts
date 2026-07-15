import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const RETA_WARNING =
  "Desde el ejercicio 2023, quien haya estado de alta en RETA o en el régimen especial del mar como trabajador por cuenta propia durante cualquier momento del año está obligado a presentar Renta. Por ello, el Modelo 121 normalmente no corresponde a una persona autónoma.";

export const MODEL_121_GUIDE_V1 = {
  code: "121",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 121 es una comunicación excepcional para que una persona no obligada a presentar declaración de la Renta ceda a otro contribuyente el derecho a determinadas deducciones familiares compartidas.",
    "No solicita un pago ni devuelve dinero. El contribuyente que recibe la cesión aplica la deducción en su Modelo 100.",
  ],
  notices: [
    { title: "Normalmente no corresponde a autónomos", paragraphs: [RETA_WARNING] },
    { title: "No se usa tras una solicitud colectiva del Modelo 143", paragraphs: ["La solicitud colectiva del abono anticipado ya implica la cesión al primer solicitante. El 121 se reserva a los restantes casos y exige que el cedente no esté obligado a declarar."] },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 121", sourceId: "aeat.model-121.procedure-home.2026-06-09", primary: true },
    { label: "Consultar la ayuda de presentación electrónica", sourceId: "aeat.model-121.electronic-help.2026-06-19", primary: true },
    { label: "Ver la declaración anual de Renta", internalHref: "/consultor-fiscal/modelos/100" },
    { label: "Ver el abono anticipado familiar", internalHref: "/consultor-fiscal/modelos/143" },
  ],
  quickSummaryTitle: "El Modelo 121 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una comunicación de cesión; no es una autoliquidación ni genera un pago." },
    { label: "Quién lo presenta", value: "El cedente que no está obligado a presentar declaración de la Renta." },
    { label: "Quién usa la deducción", value: "El cesionario la aplica en su Modelo 100." },
    { label: "Deducciones", value: "Familia numerosa y ascendientes o descendientes con discapacidad compartidos." },
    { label: "Plazo", value: "El de la campaña de Renta de cada ejercicio; debe consultarse anualmente." },
    { label: "Canales", value: "Presentación electrónica o predeclaración para entrega presencial." },
  ],
  sections: [
    {
      id: "model-121-scope",
      title: "Cuándo puede utilizarse",
      cards: [
        { title: "Derecho compartido", paragraphs: ["Dos o más contribuyentes deben tener derecho respecto de la misma familia numerosa, ascendiente o descendiente con discapacidad."] },
        { title: "Cesión a quien declara", paragraphs: ["El cedente comunica que otro contribuyente aplicará íntegramente la deducción en su declaración anual."] },
        { title: "Cedente no obligado", paragraphs: ["La persona que cede no debe estar obligada a presentar Renta conforme al artículo 96 de la Ley del IRPF."] },
        { title: "Sin solicitud colectiva", paragraphs: ["No debe haberse optado por el abono anticipado mediante una solicitud colectiva del Modelo 143, porque esa modalidad ya incorpora la cesión."] },
      ],
    },
    {
      id: "model-121-autonomous",
      title: "Por qué normalmente no es para autónomos",
      cards: [
        { title: "Alta en RETA", paragraphs: [RETA_WARNING] },
        { title: "La cesión se refleja en Renta", paragraphs: ["Cuando ambos contribuyentes presentan declaración, la cesión se consigna en las declaraciones correspondientes sin utilizar el 121."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
      ],
    },
    {
      id: "model-121-included",
      title: "Deducciones incluidas y excluidas",
      cards: [
        { title: "Incluidas", bullets: ["Familia numerosa compartida.", "Descendiente con discapacidad compartido.", "Ascendiente con discapacidad compartido."] },
        { title: "No incluidas", bullets: ["Deducción por maternidad del Modelo 140.", "Cónyuge no separado legalmente con discapacidad.", "Ascendiente separado o sin vínculo matrimonial con dos hijos."] },
      ],
      note: "El nombre general de deducciones familiares no amplía el ámbito exacto del Modelo 121 aprobado por la Orden HFP/105/2017.",
    },
    {
      id: "model-121-identification",
      title: "Personas y comunicaciones",
      cards: [
        { title: "Una comunicación por derecho", paragraphs: ["La ayuda oficial indica una comunicación por cada familia numerosa o por cada persona con discapacidad a cargo que origine la deducción."] },
        { title: "NIF obligatorio", paragraphs: ["Los ascendientes y descendientes con discapacidad relacionados deben disponer de NIF válido."] },
        { title: "Sin almacenamiento en Factu", paragraphs: ["Esta ficha no solicita ni conserva datos familiares, discapacidad, menores, NIF o documentos acreditativos."] },
      ],
    },
    {
      id: "model-121-deadline",
      title: "Plazo y presentación",
      cards: [
        { title: "Campaña de Renta", paragraphs: ["La orden fija el mismo plazo que la declaración del IRPF de cada ejercicio. No debe reutilizarse una fecha de campañas anteriores."] },
        { title: "Presentación electrónica", paragraphs: ["Se accede con Cl@ve, certificado o DNI electrónico; un representante necesita apoderamiento o colaboración social cuando corresponda."] },
        { title: "Predeclaración", paragraphs: ["Quien no disponga de identificación electrónica puede generar el PDF oficial para su presentación presencial. Generarlo no completa por sí solo el trámite."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 121",
  fillingSteps: [
    { title: "1. Confirma que el cedente no declara", paragraphs: ["Comprueba todas las causas de obligación, incluida cualquier alta como autónomo durante el ejercicio."] },
    { title: "2. Verifica el derecho compartido", paragraphs: ["Identifica una deducción incluida y a todos los contribuyentes con derecho sobre la misma familia o persona."] },
    { title: "3. Descarta una solicitud colectiva", paragraphs: ["Si ya hubo Modelo 143 colectivo, la cesión está incorporada y no debe duplicarse con el 121."] },
    { title: "4. Presenta una comunicación por derecho", paragraphs: ["Usa el trámite electrónico o la predeclaración oficial dentro de la campaña de Renta."] },
    { title: "5. Conserva el justificante", paragraphs: ["El cesionario necesitará reflejar correctamente la cesión en su Modelo 100."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Comunicación registrada", description: "La AEAT recibe la cesión; el Modelo 121 no paga ni devuelve importes." },
    { title: "Aplicación por el cesionario", description: "La persona que recibe el derecho lo incorpora a su declaración de la Renta." },
    { title: "Conservación", description: "Ambas partes deben poder acreditar los requisitos y la cesión." },
  ],
  comparison: {
    title: "Modelo 121, Modelo 100 y Modelo 143",
    current: { title: "Modelo 121", description: "Comunica una cesión cuando el cedente no está obligado a presentar Renta." },
    related: { title: "Modelo 100", description: "El cesionario aplica en Renta el derecho recibido.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    additional: [{ title: "Modelo 143", description: "Su solicitud colectiva ya implica la cesión al primer solicitante.", href: "/consultor-fiscal/modelos/143", label: "Ver Modelo 143" }],
    conclusion: "El 121 solo comunica; la deducción se aplica en el 100 y no debe duplicar la cesión ya producida por un 143 colectivo.",
  },
  pdfNotice: ["La predeclaración del Modelo 121 genera un PDF para presentar presencialmente. No contiene una miniatura estática reutilizable y descargarlo no equivale a registrarlo."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-121.procedure-record.2026-06-09" },
    { label: "Ayuda de presentación electrónica", sourceId: "aeat.model-121.electronic-help.2026-06-19" },
    { label: "Ayuda de presentación en papel", sourceId: "aeat.model-121.paper-help.2026-01-09" },
  ],
  legalLinks: [
    { label: "Orden HFP/105/2017", sourceId: "boe.model-121-order-hfp-105-2017" },
    { label: "Ley del IRPF · artículo 96", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a96" },
    { label: "Reglamento del IRPF · artículo 60 bis", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a60bis" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 121?", answer: "Una comunicación para ceder determinadas deducciones familiares cuando el cedente no está obligado a presentar Renta." },
    { question: "¿Genera un pago o devolución?", answer: "No. El cesionario aplica la deducción en su declaración anual." },
    { question: "¿Puede usarlo un autónomo?", answer: "Normalmente no: desde 2023, cualquier alta en RETA durante el año obliga a presentar Renta." },
    { question: "¿Qué deducciones permite ceder?", answer: "Familia numerosa y deducciones compartidas por ascendientes o descendientes con discapacidad." },
    { question: "¿Incluye la deducción por maternidad?", answer: "No. La maternidad se relaciona con el Modelo 140 y la declaración anual." },
    { question: "¿Incluye al cónyuge con discapacidad?", answer: "No, el ámbito aprobado del 121 no incorpora esa deducción." },
    { question: "¿Se presenta si hubo un Modelo 143 colectivo?", answer: "No. La solicitud colectiva ya implica la cesión al primer solicitante." },
    { question: "¿Cuántas comunicaciones se presentan?", answer: "Una por cada familia numerosa o por cada persona con discapacidad que origine el derecho." },
    { question: "¿Cuándo se presenta?", answer: "Dentro del plazo anual de la campaña de Renta correspondiente al ejercicio." },
    { question: "¿Cómo se presenta?", answer: "Electrónicamente o mediante la predeclaración oficial para entrega presencial." },
  ],
  sourceIds: [
    "aeat.model-121.procedure-home.2026-06-09",
    "aeat.model-121.procedure-record.2026-06-09",
    "aeat.model-121.electronic-help.2026-06-19",
    "aeat.model-121.paper-help.2026-01-09",
    "boe.model-121-order-hfp-105-2017",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
