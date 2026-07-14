import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere principalmente a los trámites de la Agencia Tributaria estatal y al territorio común. En País Vasco o Navarra la declaración puede corresponder a la Hacienda foral competente. En materia de IVA, Canarias, Ceuta y Melilla tienen regímenes fiscales distintos.";

export const MODEL_309_GUIDE_V1 = {
  code: "309",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 309 es una autoliquidación no periódica de IVA para operaciones especiales en las que existe un ingreso del impuesto y no corresponde utilizar la declaración periódica normal.",
    "No sustituye al Modelo 303 ni se presenta por cualquier factura extranjera: debe existir uno de los supuestos previstos por la normativa.",
  ],
  notices: [
    { title: "Solo para supuestos concretos", paragraphs: ["Puede afectar, entre otros, a ciertas adquisiciones intracomunitarias, minoristas en recargo de equivalencia, actividades exentas, régimen agrario, medios de transporte nuevos, adjudicaciones forzosas y determinadas regularizaciones."] },
    { title: "El resultado es a ingresar", paragraphs: ["El Modelo 309 no admite resultado a compensar, devolver, negativo ni sin actividad. Si no existe cuota que ingresar, revisa si realmente corresponde este modelo."] },
    { title: "No decide la operación", paragraphs: ["La clasificación de una operación internacional o especial requiere revisar factura, localización, condición de las partes y régimen de IVA. Esta guía no sustituye ese análisis."] },
  ],
  actions: [
    { label: "Abrir la página oficial del Modelo 309", sourceId: "aeat.model-309.procedure-home.2026-02-13", primary: true },
    { label: "Consultar instrucciones oficiales", sourceId: "aeat.model-309.instructions.2026-06-09", primary: true },
    { label: "Ver ayuda de presentación electrónica", sourceId: "aeat.model-309.browser-help.2026-06-19" },
    { label: "Ver ayuda de predeclaración", sourceId: "aeat.model-309.predeclaration-help.2026-01-15" },
  ],
  quickSummaryTitle: "El Modelo 309 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una autoliquidación especial y no periódica de IVA." },
    { label: "Resultado", value: "Siempre a ingresar." },
    { label: "Sustituye al 303", value: "No." },
    { label: "Factura extranjera", value: "No basta por sí sola; hay que clasificar la operación." },
    { label: "Periodos", value: "1T–4T o 0A, según el supuesto." },
    { label: "Plazo", value: "Trimestral general, 30 días o un mes en supuestos especiales." },
    { label: "Presentación", value: "Electrónica o predeclaración para quienes puedan usarla." },
    { label: "Genera devolución", value: "No." },
  ],
  sections: [
    {
      id: "model-309-decision",
      title: "¿Cuándo puede corresponder?",
      cards: [
        { title: "Recargo de equivalencia", paragraphs: ["Un minorista puede tener que ingresar IVA y, en su caso, recargo en adquisiciones intracomunitarias, inversión del sujeto pasivo u operaciones especiales en las que el proveedor no lo repercute como en una compra nacional ordinaria."] },
        { title: "Actividad exenta", paragraphs: ["Quien realiza exclusivamente operaciones sin derecho a deducción puede necesitar el 309 por determinadas adquisiciones intracomunitarias o inversiones del sujeto pasivo."] },
        { title: "Régimen agrario", paragraphs: ["Puede utilizarse para reintegrar compensaciones indebidamente percibidas o regularizar existencias en supuestos previstos al pasar al régimen especial de agricultura, ganadería y pesca."] },
        { title: "Otros supuestos", bullets: ["Adquisiciones intracomunitarias de medios de transporte nuevos.", "Adjudicaciones en procedimientos judiciales o administrativos de ejecución forzosa.", "Incumplimiento de requisitos de ciertos beneficios fiscales de IVA."] },
      ],
    },
    {
      id: "model-309-foreign",
      title: "Compras extranjeras y operaciones intracomunitarias",
      cards: [
        { title: "No toda factura extranjera va al 309", paragraphs: ["Distingue bien o servicio, país, transporte, identificación IVA de las partes, lugar de realización e inversión del sujeto pasivo. Una importación aduanera no es lo mismo que una adquisición intracomunitaria."] },
        { title: "Modelo 349", paragraphs: ["El 349 es informativo y comunica determinadas operaciones intracomunitarias. Puede coexistir con una liquidación de IVA, pero no la sustituye."], links: [{ label: "Ver Modelo 349", href: "/consultor-fiscal/modelos/349" }] },
        { title: "Modelo 036", paragraphs: ["El alta censal y, cuando proceda, la inscripción en el ROI se comunican mediante el 036. La factura concreta sigue necesitando su propio análisis."], links: [{ label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" }] },
      ],
    },
    {
      id: "model-309-vs-303",
      title: "Relación con el Modelo 303",
      cards: [
        { title: "Modelo 303", paragraphs: ["Es la autoliquidación periódica habitual de IVA para quienes están obligados a presentarla."], links: [{ label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" }] },
        { title: "Modelo 309", paragraphs: ["Atiende supuestos especiales cuando el obligado no presenta periódicamente el 303 por esa actividad u operación, o cuando la norma reserva el supuesto al 309."] },
        { title: "No duplicar", paragraphs: ["Una misma cuota no debe liquidarse dos veces. Revisa el régimen y el periodo antes de escoger el modelo."] },
      ],
    },
    {
      id: "model-309-result",
      title: "Qué importe se declara",
      cards: [
        { title: "Cuota de IVA", paragraphs: ["Se parte de la base y el tipo aplicable según la operación. En los supuestos de recargo de equivalencia se añade el recargo que corresponda."] },
        { title: "Sin deducción ni compensación general", paragraphs: ["No funciona como un 303 periódico con cuotas a compensar. La autoliquidación especial concluye con un ingreso."] },
        { title: "Cada supuesto exige documentación", paragraphs: ["Conserva factura, contrato, justificante del transporte o adjudicación, datos técnicos del vehículo y cálculo aplicado, según el caso."] },
      ],
    },
    {
      id: "model-309-deadlines",
      title: "Plazos y periodos",
      cards: [
        { title: "Regla general trimestral", paragraphs: ["En los demás supuestos, se presenta e ingresa en los veinte primeros días naturales de abril, julio y octubre; el cuarto trimestre, durante los treinta primeros días naturales de enero."] },
        { title: "Medio de transporte nuevo", paragraphs: ["Treinta días desde la operación y siempre antes de la matriculación definitiva. Se presenta una autoliquidación por cada medio de transporte."] },
        { title: "Ejecución forzosa", paragraphs: ["Un mes desde el pago del importe de la adjudicación y no antes de que se emita la factura que documenta la operación."] },
      ],
      note: "El periodo 0A se reserva a supuestos no periódicos específicos. No debe elegirse por comodidad cuando corresponde un trimestre.",
    },
    {
      id: "model-309-filing",
      title: "Presentación, pago y correcciones",
      cards: [
        { title: "Formulario electrónico", paragraphs: ["Permite cumplimentar, importar o exportar fichero, validar, firmar y enviar. El justificante oficial acredita la presentación."] },
        { title: "Predeclaración", paragraphs: ["Las personas no obligadas a certificado pueden generar una predeclaración cuando el servicio esté disponible. Generar o imprimir el PDF no equivale por sí solo a presentarlo y pagarlo."] },
        { title: "Pago", paragraphs: ["Selecciona una forma oficial disponible y completa el ingreso. La ayuda electrónica contempla distintas opciones de reconocimiento de deuda."] },
      ],
      note: "Una complementaria sirve cuando la nueva autoliquidación aumenta el ingreso o reduce una devolución improcedente. Para otros errores puede corresponder solicitar rectificación; no presentes otra complementaria automáticamente.",
    },
    {
      id: "model-309-checklist",
      title: "Comprobación antes de presentarlo",
      accordions: [
        { question: "¿Existe un supuesto legal concreto?", paragraphs: ["Identifica exactamente por qué corresponde el 309. Una factura sin IVA o emitida por un proveedor extranjero no es una respuesta suficiente."] },
        { question: "¿Quién es el obligado y qué régimen tiene?", paragraphs: ["Comprueba quién realiza la adquisición u operación, su condición de empresario o particular y el régimen de IVA aplicable."] },
        { question: "¿El periodo y plazo son correctos?", paragraphs: ["Distingue trimestre, 0A, vehículo nuevo y ejecución forzosa. Verifica también vencimientos y domiciliación vigentes."] },
      ],
    },
    { id: "model-309-territory", title: "Ámbito territorial", note: TERRITORIAL_NOTE },
  ],
  fillingTitle: "Cómo preparar el Modelo 309",
  fillingSteps: [
    { title: "1. Clasifica la operación", paragraphs: ["Determina su naturaleza, territorio, régimen y motivo legal del 309."] },
    { title: "2. Reúne documentos", paragraphs: ["Factura, contrato, transporte, adjudicación, ficha técnica o regularización que corresponda."] },
    { title: "3. Calcula la cuota", paragraphs: ["Aplica base, tipo y recargo cuando proceda, sin convertirlo en una compensación periódica."] },
    { title: "4. Elige periodo y plazo", paragraphs: ["Comprueba trimestre, 0A o plazo especial antes de acceder al servicio."] },
    { title: "5. Presenta, ingresa y conserva", paragraphs: ["Firma en la AEAT, completa el pago y guarda justificante, NRC o reconocimiento de deuda y soporte del cálculo."] },
  ],
  afterTitle: "Después de presentar",
  afterSteps: [
    { title: "Archivo", description: "Conserva justificante, factura, cálculo y documento que acredita el supuesto especial." },
    { title: "Matriculación", description: "En medios de transporte nuevos, conserva el ejemplar o justificante exigido para la matriculación." },
    { title: "Error", description: "Distingue complementaria de solicitud de rectificación según el efecto del error." },
  ],
  comparison: {
    title: "Cómo se relacionan los Modelos 100, 309 y 184",
    current: { title: "Modelo 309", description: "Autoliquidación especial de IVA para operaciones concretas y con resultado a ingresar." },
    related: { title: "Modelo 100", description: "Declaración anual personal del IRPF; no liquida este IVA especial.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    additional: [{ title: "Modelo 184", description: "Declaración informativa anual de entidades en atribución de rentas.", href: "/consultor-fiscal/modelos/184", label: "Ver Modelo 184" }],
    conclusion: "El 309 se centra en IVA especial; el 100 en la Renta personal y el 184 en información atribuida por una entidad.",
  },
  pdfNotice: ["La vista previa o predeclaración generada no acredita por sí sola la presentación. Completa el canal oficial aplicable y conserva el justificante."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-309.procedure-record.2026-06-09" },
    { label: "Instrucciones oficiales", sourceId: "aeat.model-309.instructions.2026-06-09" },
    { label: "Ayuda del formulario electrónico", sourceId: "aeat.model-309.browser-help.2026-06-19" },
    { label: "Ayuda de predeclaración", sourceId: "aeat.model-309.predeclaration-help.2026-01-15" },
  ],
  legalLinks: [
    { label: "Orden HAC/3625/2003 consolidada", sourceId: "boe.model-309.order-hac-3625-2003.original" },
    { label: "Orden HFP/1247/2017", sourceId: "boe.model-309.order-hfp-1247-2017.original" },
    { label: "Orden EHA/3212/2004", sourceId: "boe.model-309.order-eha-3212-2004.original" },
  ],
  faq: [
    { question: "¿El Modelo 309 sustituye al 303?", answer: "No. Es una autoliquidación no periódica para supuestos especiales." },
    { question: "¿Toda factura extranjera obliga a presentarlo?", answer: "No. Hay que clasificar la operación y el régimen de quien la recibe." },
    { question: "¿Puede afectar a un minorista en recargo de equivalencia?", answer: "Sí, en determinadas operaciones en las que debe ingresar IVA y, en su caso, recargo." },
    { question: "¿Puede afectar a una actividad exenta?", answer: "Sí, en determinados supuestos como adquisiciones intracomunitarias o inversión del sujeto pasivo." },
    { question: "¿Puede afectar al régimen agrario?", answer: "Sí, para reintegros o regularizaciones expresamente previstos." },
    { question: "¿Se usa para un vehículo nuevo comprado en otro país de la UE?", answer: "Puede corresponder y tiene plazo especial de 30 días, antes de matricular." },
    { question: "¿Puede salir a devolver?", answer: "No." },
    { question: "¿Puede presentarse sin actividad o a cero?", answer: "No es la finalidad del modelo; revisa si existe cuota y supuesto de ingreso." },
    { question: "¿Cuándo se presenta normalmente?", answer: "En los plazos trimestrales indicados por la AEAT, salvo supuestos especiales." },
    { question: "¿Qué significa 0A?", answer: "Es el periodo no periódico reservado a supuestos específicos, no una alternativa general al trimestre." },
    { question: "¿La predeclaración PDF ya está presentada?", answer: "No; debe completarse el procedimiento oficial y el ingreso." },
    { question: "¿Cómo corrijo un error?", answer: "Usa complementaria si aumenta el ingreso; para otros casos revisa la solicitud de rectificación aplicable." },
  ],
  sourceIds: [
    "aeat.model-309.procedure-home.2026-02-13",
    "aeat.model-309.procedure-record.2026-06-09",
    "aeat.model-309.instructions.2026-06-09",
    "aeat.model-309.browser-help.2026-06-19",
    "aeat.model-309.predeclaration-help.2026-01-15",
    "boe.model-309.order-hac-3625-2003.original",
    "boe.model-309.order-hfp-1247-2017.original",
    "boe.model-309.order-eha-3212-2004.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
