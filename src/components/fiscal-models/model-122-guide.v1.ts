import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const RETA_WARNING =
  "Desde 2023, cualquier persona que haya estado de alta en RETA o en el régimen especial del mar como trabajador por cuenta propia durante el ejercicio está obligada a presentar Renta. Por eso un autónomo regulariza normalmente en el Modelo 100, no en el 122.";

export const MODEL_122_GUIDE_V1 = {
  code: "122",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 122 es una autoliquidación para devolver el exceso de abonos anticipados de determinadas deducciones familiares del artículo 81 bis cuando quien los recibió no está obligado a presentar la declaración de la Renta.",
    "Su resultado es a ingresar: devuelve el principal cobrado de más. No es el formulario general para corregir la deducción por maternidad del Modelo 140.",
  ],
  notices: [
    { title: "Normalmente no corresponde a autónomos", paragraphs: [RETA_WARNING] },
    { title: "Reconocer una deuda no concede por sí solo un aplazamiento", paragraphs: ["La presentación puede ofrecer reconocimiento de deuda, pero después debe tramitarse el pago, aplazamiento o compensación que corresponda en la sede de la AEAT."] },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 122", sourceId: "aeat.model-122.procedure-home.2026-06-09", primary: true },
    { label: "Consultar la ayuda de presentación electrónica", sourceId: "aeat.model-122.electronic-help.2026-06-19", primary: true },
    { label: "Ver la declaración anual de Renta", internalHref: "/consultor-fiscal/modelos/100" },
    { label: "Ver el abono anticipado familiar", internalHref: "/consultor-fiscal/modelos/143" },
  ],
  quickSummaryTitle: "El Modelo 122 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una autoliquidación para ingresar abonos familiares cobrados en exceso." },
    { label: "Quién lo presenta", value: "La persona que recibió el exceso y no está obligada a presentar Renta." },
    { label: "Deducciones", value: "Las del artículo 81 bis: familia numerosa, discapacidad, ascendiente con dos hijos y supuestos incorporados legalmente." },
    { label: "Periodo", value: "0A, correspondiente al ejercicio anual que se regulariza." },
    { label: "Plazo", value: "Desde que se percibe indebidamente hasta que termina la campaña de Renta del ejercicio." },
    { label: "Resultado", value: "Positivo a ingresar por la diferencia entre anticipo recibido y derecho real." },
  ],
  sections: [
    {
      id: "model-122-scope",
      title: "Cuándo se utiliza",
      cards: [
        { title: "Abono anticipado superior al derecho", paragraphs: ["Debe existir un exceso real entre lo cobrado por una deducción del artículo 81 bis y la cuantía definitiva que correspondía."] },
        { title: "Contribuyente no obligado a declarar", paragraphs: ["El 122 solo cubre al perceptor que no presenta Modelo 100. Quien está obligado regulariza el exceso en su declaración anual."] },
        { title: "Ejercicio y periodo", paragraphs: ["La autoliquidación identifica el ejercicio afectado y utiliza el periodo anual 0A."] },
      ],
    },
    {
      id: "model-122-autonomous",
      title: "Autónomos y declaración anual",
      cards: [
        { title: "Alta en RETA", paragraphs: [RETA_WARNING] },
        { title: "Regularización en Modelo 100", paragraphs: ["La declaración anual resta los anticipos y determina el derecho definitivo de quien está obligado a declarar."], links: [{ label: "Ver Modelo 100", href: "/consultor-fiscal/modelos/100" }] },
      ],
    },
    {
      id: "model-122-included",
      title: "Qué deducciones puede regularizar",
      cards: [
        { title: "Artículo 81 bis", bullets: ["Familia numerosa.", "Descendientes o ascendientes con discapacidad.", "Ascendiente separado o sin vínculo matrimonial con dos hijos.", "Cónyuge no separado legalmente con discapacidad.", "Incremento por hijos adicionales de familia numerosa."] },
        { title: "No es la regularización general de maternidad", paragraphs: ["Los anticipos del Modelo 140 pertenecen a la deducción por maternidad del artículo 81, no al ámbito general del Modelo 122."] },
      ],
    },
    {
      id: "model-122-calculation",
      title: "Cómo se calcula el importe",
      cards: [
        { title: "Diferencia a devolver", paragraphs: ["Se compara el abono anticipado percibido con la deducción realmente generada para cada derecho y persona relacionada."] },
        { title: "Ejemplo didáctico", bullets: ["Abonos anticipados recibidos: 1.200 €.", "Derecho definitivo: 800 €.", "Exceso a ingresar mediante el 122: 400 €."] },
        { title: "Intereses", paragraphs: ["El Reglamento prevé que, cuando el incumplimiento no sea imputable al contribuyente, no se exijan intereses de demora por la percepción indebida; el principal cobrado de más sí debe reintegrarse. Si existen otras circunstancias, comprueba el criterio oficial aplicable."] },
      ],
      note: "El ejemplo no calcula un caso real. Revisa meses, personas, límites y abonos de cada deducción antes de presentar.",
    },
    {
      id: "model-122-deadline",
      title: "Plazo y formas de pago",
      cards: [
        { title: "Plazo abierto", paragraphs: ["La orden permite regularizar desde la fecha en que se percibe indebidamente el anticipo hasta el fin del plazo de Renta del ejercicio afectado."] },
        { title: "Ingreso", paragraphs: ["La ayuda contempla domiciliación dentro de su plazo, pago con NRC y otras modalidades disponibles en el formulario oficial."] },
        { title: "Reconocimiento de deuda", paragraphs: ["Tras presentar con reconocimiento de deuda puede ser necesario entrar en Tramitar deuda y elegir aplazar, compensar o pagar. La concesión no es automática."] },
        { title: "Predeclaración", paragraphs: ["También existe un formulario para obtener el documento de presentación presencial cuando se cumplen sus condiciones."] },
      ],
    },
    {
      id: "model-122-corrections",
      title: "Errores y justificantes",
      cards: [
        { title: "Valida antes de enviar", paragraphs: ["El formulario calcula la liquidación con los registros introducidos. Revisa ejercicio, periodo, personas y cuantías antes de firmar."] },
        { title: "No inventes una corrección", paragraphs: ["Si un 122 ya presentado contiene un error, utiliza el procedimiento que indique la AEAT para el sentido concreto del error. Esta guía no presupone que siempre corresponda una complementaria o una segunda declaración."] },
        { title: "Conserva la respuesta", paragraphs: ["Guarda número de justificante, CSV, PDF, NRC y, en su caso, resolución posterior sobre la deuda."] },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 122",
  fillingSteps: [
    { title: "1. Confirma que no debes presentar Renta", paragraphs: ["Comprueba todas las causas de obligación. Si estuviste de alta como autónomo, utiliza el Modelo 100."] },
    { title: "2. Separa cada deducción", paragraphs: ["Identifica anticipos, meses y derecho definitivo de cada familia o persona relacionada."] },
    { title: "3. Calcula solo el exceso", paragraphs: ["Resta el derecho real de los pagos anticipados recibidos y revisa el resultado por deducción."] },
    { title: "4. Selecciona ejercicio y periodo 0A", paragraphs: ["Comprueba que la autoliquidación corresponde al año en que se percibió indebidamente el abono."] },
    { title: "5. Valida, paga o tramita la deuda", paragraphs: ["Completa la presentación oficial y conserva todos los justificantes de registro y pago."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Ingreso", description: "El exceso queda regularizado cuando se presenta y se atiende el pago o la deuda." },
    { title: "Justificante", description: "Conserva PDF, CSV, NRC y cualquier resolución posterior." },
    { title: "Revisión", description: "Si detectas un error, consulta el procedimiento oficial aplicable antes de presentar otra declaración." },
  ],
  comparison: {
    title: "Modelo 122, Modelo 100 y Modelo 143",
    current: { title: "Modelo 122", description: "Devuelve un exceso de abono familiar cuando el perceptor no está obligado a declarar." },
    related: { title: "Modelo 100", description: "Regulariza el derecho de las personas obligadas a presentar Renta.", href: "/consultor-fiscal/modelos/100", label: "Ver Modelo 100" },
    additional: [{ title: "Modelo 143", description: "Es la solicitud de los abonos anticipados familiares que después pueden necesitar conciliación.", href: "/consultor-fiscal/modelos/143", label: "Ver Modelo 143" }],
    conclusion: "El 143 anticipa; el 100 regulariza a quien declara y el 122 solo a quien no está obligado a hacerlo.",
  },
  pdfNotice: ["La AEAT genera el justificante tras una presentación correcta. Exportar el fichero o descargar una predeclaración no acredita por sí solo que el Modelo 122 se haya presentado ni pagado."],
  documents: [],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-122.procedure-record.2026-06-09" },
    { label: "Ayuda de presentación electrónica", sourceId: "aeat.model-122.electronic-help.2026-06-19" },
    { label: "Ayuda de presentación en papel", sourceId: "aeat.model-122.paper-help.2026-02-02" },
  ],
  legalLinks: [
    { label: "Orden HFP/105/2017", sourceId: "boe.model-122.order-hfp-105-2017" },
    { label: "Orden HAC/763/2018", sourceId: "boe.model-122.order-hac-763-2018" },
    { label: "Ley del IRPF · artículo 81 bis", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a81bis" },
    { label: "Reglamento del IRPF · artículo 60 bis", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a60bis" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 122?", answer: "La autoliquidación para devolver abonos anticipados de deducciones del artículo 81 bis cobrados en exceso por un no declarante." },
    { question: "¿Quién lo presenta?", answer: "La persona que recibió el exceso y no está obligada a presentar la declaración de la Renta." },
    { question: "¿Lo presenta un autónomo?", answer: "Normalmente no; cualquier alta en RETA durante el ejercicio obliga a declarar desde 2023 y se regulariza en el Modelo 100." },
    { question: "¿Sirve para la deducción por maternidad?", answer: "No es la regularización general de la maternidad del artículo 81 ni de los anticipos solicitados con el Modelo 140." },
    { question: "¿Incluye al cónyuge con discapacidad?", answer: "Sí, el ámbito actual del artículo 81 bis y de la modificación de 2018 incluye esta deducción cuando corresponda." },
    { question: "¿Qué periodo se indica?", answer: "El periodo anual 0A del ejercicio que se regulariza." },
    { question: "¿Cuál es el plazo?", answer: "Desde la percepción indebida hasta el final del plazo de Renta de ese ejercicio." },
    { question: "¿Cómo se calcula?", answer: "Se ingresa la diferencia entre los anticipos recibidos y el derecho definitivo realmente generado." },
    { question: "¿Se pagan intereses?", answer: "Cuando el incumplimiento no es imputable al contribuyente, el Reglamento excluye intereses por el anticipo indebido; el principal sí se devuelve." },
    { question: "¿Cómo se paga?", answer: "Mediante las opciones oficiales disponibles, como domiciliación, NRC o reconocimiento de deuda, según el plazo y el formulario." },
    { question: "¿Reconocer la deuda concede aplazamiento?", answer: "No. Después debe tramitarse y obtenerse la decisión correspondiente de la AEAT." },
    { question: "¿Cómo corrijo un 122 erróneo?", answer: "Consulta el procedimiento oficial según el sentido del error; no debe asumirse automáticamente una complementaria." },
  ],
  sourceIds: [
    "aeat.model-122.procedure-home.2026-06-09",
    "aeat.model-122.procedure-record.2026-06-09",
    "aeat.model-122.electronic-help.2026-06-19",
    "aeat.model-122.paper-help.2026-02-02",
    "boe.model-122.order-hfp-105-2017",
    "boe.model-122.order-hac-763-2018",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
