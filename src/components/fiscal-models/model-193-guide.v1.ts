import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere a la Agencia Tributaria estatal y al territorio común. En País Vasco o Navarra la obligación puede corresponder a la Hacienda foral competente.";

export const MODEL_193_GUIDE_V1 = {
  code: "193",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 193 es una declaración informativa anual que identifica a las personas y entidades que han recibido determinadas rentas del capital mobiliario y otras rentas relacionadas con las retenciones ingresadas durante el año.",
    "No vuelve a pagar las retenciones: detalla por perceptor lo que los Modelos 123 periódicos muestran de forma agregada.",
  ],
  notices: [
    {
      title: "No sustituye los Modelos 123",
      paragraphs: ["El 193 es el resumen anual. Si un 123 periódico está equivocado, debe revisarse también esa autoliquidación; corregir el 193 no lo corrige automáticamente."],
    },
    {
      title: "Claves y diseños con revisión anual",
      paragraphs: ["Las claves, campos, diseños y canales deben comprobarse para el ejercicio declarado. No copies un fichero ni una clave de otro año sin validarlos."],
    },
    {
      title: "Ámbito territorial",
      paragraphs: [TERRITORIAL_NOTE],
    },
  ],
  actions: [
    { label: "Abrir gestiones oficiales del Modelo 193", sourceId: "aeat.model-193.procedure-home.2026-05-29", primary: true },
    { label: "Consultar ayuda del formulario web", sourceId: "aeat.model-193.browser-form-help.2026-06-19", primary: true },
    { label: "Consultar presentación mediante fichero", sourceId: "aeat.model-193.file-upload-help.2026-06-19" },
    { label: "Consultar tipos de retención de 2026", href: "https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/CUADRO_TIPOS_RETENCION_IRPF_2026.pdf" },
    { label: "Ver obligaciones del retenedor", href: "https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta-pagos-fraccionados/retenciones-ingresos-cuenta/obligaciones-retenedor.html" },
  ],
  quickSummaryTitle: "El Modelo 193 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración informativa anual; no genera un nuevo pago de las retenciones." },
    { label: "Qué detalla", value: "Cada perceptor, la clase de renta, importes y retenciones según el diseño del ejercicio." },
    { label: "Relación principal", value: "Con los Modelos 123 presentados y corregidos durante el año." },
    { label: "Formulario web", value: "La AEAT ofrece el formulario para declaraciones de hasta 40.000 registros." },
    { label: "Fichero", value: "Es obligatorio por encima de 40.000 registros y está disponible también para declaraciones menores." },
    { label: "Territorio", value: "La guía describe el modelo estatal; los territorios forales pueden tener reglas propias." },
  ],
  sections: [
    {
      id: "model-193-who",
      title: "Quién lo presenta y qué información contiene",
      cards: [
        { title: "El retenedor", paragraphs: ["Lo presenta quien durante el ejercicio pagó rentas incluidas y practicó o debió practicar las retenciones correspondientes."] },
        { title: "Un registro por perceptor", paragraphs: ["El resumen anual identifica a cada persona o entidad perceptora con su Número de Identificación Fiscal (NIF), importes y demás datos exigidos por el diseño vigente."] },
        { title: "No es una nueva autoliquidación", paragraphs: ["El Modelo 193 no vuelve a ingresar lo ya declarado periódicamente. Su función es informativa y de conciliación anual."] },
      ],
    },
    {
      id: "model-193-income",
      title: "Rentas y claves del ejercicio",
      cards: [
        { title: "Clave A", paragraphs: ["Se utiliza para determinados rendimientos o rentas obtenidos por la participación en fondos propios de entidades, como ciertos dividendos."] },
        { title: "Clave B", paragraphs: ["Se utiliza para determinados rendimientos o rentas obtenidos por la cesión a terceros de capitales propios, como ciertos intereses."] },
        { title: "Clave C", paragraphs: ["Agrupa otros rendimientos del capital mobiliario o rentas sujetos al diseño del Modelo 193."] },
      ],
      note: "Esta descripción es orientativa. Las subclaves y campos deben revisarse en el diseño del registro del ejercicio antes de presentar.",
    },
    {
      id: "model-193-exclusions",
      title: "Otros resúmenes que no deben mezclarse",
      cards: [
        { title: "Modelo 190", paragraphs: ["Trabajo, actividades económicas y otras rentas relacionadas con el Modelo 111."], links: [{ label: "Ver Modelo 190", href: "/consultor-fiscal/modelos/190" }] },
        { title: "Modelo 180", paragraphs: ["Determinados alquileres urbanos relacionados con el Modelo 115."], links: [{ label: "Ver Modelo 180", href: "/consultor-fiscal/modelos/180" }] },
        { title: "Modelos 194 y 196", paragraphs: ["Determinadas operaciones sobre activos financieros y rendimientos de cuentas tienen resúmenes específicos."], links: [{ label: "Ver Modelo 194", href: "/consultor-fiscal/modelos/194" }, { label: "Ver Modelo 196", href: "/consultor-fiscal/modelos/196" }] },
        { title: "Modelo 296", paragraphs: ["Determinadas rentas pagadas a no residentes sin establecimiento permanente se resumen en el Modelo 296."], links: [{ label: "Ver Modelo 296", href: "/consultor-fiscal/modelos/296" }] },
      ],
      note: "No todas las rentas del capital se incluyen en el 193. Clasifica la operación antes de elegir el resumen anual.",
    },
    {
      id: "model-193-reconcile",
      title: "Conciliación con el Modelo 123",
      cards: [
        { title: "Totales periódicos", paragraphs: ["Suma las bases y retenciones de los 123 presentados, incluidos los corregidos."] },
        { title: "Detalle anual", paragraphs: ["El desglose por perceptor del 193 debe explicar esos totales y las diferencias justificadas."], links: [{ label: "Ver la guía del Modelo 123", href: "/consultor-fiscal/modelos/123" }] },
        { title: "Contabilidad y certificados", paragraphs: ["Contrasta libros, pagos, datos identificativos y certificados emitidos. El certificado debe ser coherente con el 193, pero no lo sustituye."] },
      ],
    },
    {
      id: "model-193-modes",
      title: "Formulario normal y simplificado",
      cards: [
        { title: "Modalidad normal", paragraphs: ["Permite cumplimentar el conjunto de campos previsto por la ayuda y el diseño del ejercicio."] },
        { title: "Modalidad simplificada", paragraphs: ["La ayuda del formulario ofrece una modalidad simplificada y advierte de sus limitaciones, entre ellas que no admite gastos."] },
      ],
      note: "La modalidad se elige al crear la declaración y no puede cambiarse después dentro de esa declaración. Comprueba cuál corresponde antes de empezar.",
    },
    {
      id: "model-193-channels",
      title: "Cómo se presenta",
      cards: [
        { title: "Formulario web", paragraphs: ["La sede indica un límite de hasta 40.000 registros. Permite importar la declaración del año anterior, añadir perceptores, validar y obtener una vista previa."] },
        { title: "Presentación mediante fichero", paragraphs: ["Por encima de 40.000 registros debe utilizarse un fichero ajustado al diseño vigente. La plataforma TGVI valida y envía registros."] },
        { title: "Vista previa", paragraphs: ["El PDF de vista previa lleva una marca que indica que no es válido para presentar. Solo la firma y el envío generan la declaración presentada y su justificante."] },
      ],
    },
    {
      id: "model-193-errors",
      title: "Validación, envíos parciales y correcciones",
      accordions: [
        { question: "¿Qué pasa si hay registros erróneos?", paragraphs: ["El canal mediante fichero puede admitir los registros correctos y dejar los erróneos pendientes. Corrige los rechazados y vuelve a enviar la declaración completa según la ayuda oficial para evitar omisiones."] },
        { question: "¿Validar un fichero equivale a presentar?", paragraphs: ["No. La validación comprueba el formato; la presentación requiere completar la firma y el envío y obtener el justificante oficial."] },
        { question: "¿Cómo se corrige una declaración ya presentada?", paragraphs: ["La consulta permite acceder a la declaración del ejercicio y gestionar las altas, modificaciones o bajas que correspondan. La corrección del 193 no modifica automáticamente los 123."] },
      ],
    },
    {
      id: "model-193-deadline",
      title: "Ejercicio y plazo",
      cards: [
        { title: "Resumen del año anterior", paragraphs: ["El Modelo 193 se presenta por el ejercicio al que pertenecen las rentas. Con carácter general, su plazo se sitúa en enero del año siguiente."] },
        { title: "Ejercicio disponible", paragraphs: ["Utiliza siempre el trámite y el diseño del ejercicio que vas a declarar. La sede mantiene accesos separados para ejercicios anteriores."] },
      ],
      note: "Comprueba el calendario oficial y la disponibilidad del ejercicio antes de presentar; no deduzcas el plazo solo de una ficha histórica.",
    },
  ],
  fillingTitle: "Cómo preparar el resumen anual",
  fillingSteps: [
    { title: "1. Reúne los Modelos 123", paragraphs: ["Incluye todos los periodos y sus correcciones, junto con la contabilidad y los pagos."] },
    { title: "2. Identifica a cada perceptor", paragraphs: ["Comprueba NIF, residencia y datos identificativos antes de clasificar la renta."] },
    { title: "3. Asigna claves y campos", paragraphs: ["Consulta el diseño vigente del ejercicio; no copies claves o subclaves de otra campaña."] },
    { title: "4. Concilia los totales", paragraphs: ["Explica las diferencias entre perceptores, 123, libros y certificados antes de validar."] },
    { title: "5. Presenta y conserva", paragraphs: ["Usa el canal adecuado, firma, envía y conserva justificante y Código Seguro de Verificación (CSV)."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Justificante", description: "Comprueba el estado final y conserva la respuesta oficial." },
    { title: "Certificados", description: "Entrega o pon a disposición de cada perceptor su certificado cuando corresponda." },
    { title: "Correcciones", description: "Distingue la corrección del registro anual de la autoliquidación periódica afectada." },
  ],
  comparison: {
    title: "Modelo 193 y Modelo 123",
    current: { title: "Modelo 193", description: "Detalle anual informativo por perceptor; no genera un nuevo pago." },
    related: { title: "Modelo 123", description: "Autoliquidación periódica que ingresa determinadas retenciones.", href: "/consultor-fiscal/modelos/123", label: "Ver Modelo 123" },
    additional: [{ title: "Modelo 190", description: "Resumen anual de trabajo, profesionales y otras rentas relacionadas con el 111.", href: "/consultor-fiscal/modelos/190", label: "Ver Modelo 190" }],
    conclusion: "El 123 ingresa periódicamente y el 193 identifica anualmente a cada perceptor de las rentas incluidas.",
  },
  pdfNotice: ["El diseño de registro corresponde al ejercicio que indica su documento. Es documentación técnica, no un formulario para firmar ni una declaración presentada."],
  documents: [{ label: "Descargar diseño de registro del Modelo 193", sourceId: "aeat.model-193.register-design-pdf.2026-07-13" }],
  officialLinks: [
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-193.procedure-record.2026-07-08" },
    { label: "Ayuda oficial del formulario web", sourceId: "aeat.model-193.browser-form-help.2026-06-19" },
    { label: "Ayuda oficial de presentación mediante fichero", sourceId: "aeat.model-193.file-upload-help.2026-06-19" },
  ],
  legalLinks: [
    { label: "Orden EHA/3377/2011", sourceId: "boe.model-193.order-eha-3377-2011" },
    { label: "Orden HAC/1504/2024", sourceId: "boe.models-192-193.order-hac-1504-2024" },
    { label: "Orden HAC/1430/2025", sourceId: "boe.model-193.order-hac-1430-2025" },
    { label: "Ley 35/2006 del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764" },
    { label: "Reglamento del IRPF", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 193?", answer: "Una declaración informativa anual de determinadas rentas y retenciones del capital mobiliario y otras rentas incluidas en su diseño." },
    { question: "¿Vuelve a pagar las retenciones?", answer: "No. El ingreso periódico se realiza mediante el modelo que corresponda, habitualmente el 123 para las rentas relacionadas." },
    { question: "¿Incluye un registro por cada perceptor?", answer: "Sí. Debe identificar a cada perceptor y detallar la renta conforme al diseño del ejercicio." },
    { question: "¿Qué significan las claves A, B y C?", answer: "Distinguen grandes grupos de rentas. La clave y subclave exactas deben verificarse en el diseño vigente." },
    { question: "¿Incluye cualquier renta del capital?", answer: "No. Algunas operaciones se resumen mediante los Modelos 188, 194, 196 u otros específicos." },
    { question: "¿Tiene que coincidir con el Modelo 123?", answer: "Sus totales deben poder conciliarse con los 123 presentados y corregidos, la contabilidad y los certificados." },
    { question: "¿Cuándo se presenta?", answer: "Con carácter general, durante enero del año siguiente, comprobando siempre el calendario oficial del ejercicio." },
    { question: "¿Cuándo uso el formulario web?", answer: "La AEAT lo ofrece para declaraciones de hasta 40.000 registros." },
    { question: "¿Cuándo uso un fichero?", answer: "Es obligatorio por encima de 40.000 registros y puede utilizarse también con un número menor." },
    { question: "¿La vista previa es válida para presentar?", answer: "No. Debes firmar y enviar y obtener el justificante oficial." },
    { question: "¿Qué ocurre con los registros erróneos?", answer: "Corrige los rechazados y sigue el flujo oficial de reenvío completo para no omitir perceptores." },
    { question: "¿Cómo corrijo una declaración presentada?", answer: "Accede a la consulta del ejercicio y realiza las altas, modificaciones o bajas necesarias; revisa también los 123 afectados." },
  ],
  sourceIds: [
    "aeat.model-193.procedure-home.2026-05-29",
    "aeat.model-193.procedure-record.2026-07-08",
    "aeat.model-193.browser-form-help.2026-06-19",
    "aeat.model-193.file-upload-help.2026-06-19",
    "aeat.model-193.register-design-pdf.2026-07-13",
    "boe.model-193.order-eha-3377-2011",
    "boe.models-192-193.order-hac-1504-2024",
    "boe.model-193.order-hac-1430-2025",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
