import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_318_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "318",
  category: "IVA · Administración estatal y foral",
  statusLabel: "Regularización territorial especializada",
  statusTone: "territorial",
  effectiveYear: 2026,
  intro: [
    "El Modelo 318 regulariza las proporciones de tributación del IVA aplicadas antes del inicio habitual de entregas o prestaciones entre la Administración estatal y las Haciendas forales.",
    "No es una autoliquidación ordinaria de IVA ni corresponde a cualquier alta de autónomo.",
  ],
  notices: [
    {
      title: "Concierto Económico y cambio de proporciones",
      paragraphs: [
        "Debe existir el supuesto territorial y una diferencia relevante entre proporciones provisionales y definitivas, incluida la variación del 40 % cuando resulte aplicable.",
      ],
    },
  ],
  type: "Regularización especial de IVA entre Administraciones.",
  presenter:
    "Sujeto pasivo afectado por la regularización territorial de cuotas anteriores al inicio habitual de la actividad.",
  nonPresenter:
    "Cualquier autónomo nuevo o quien tributa íntegramente ante una sola Administración sin el supuesto de regularización.",
  periodicity:
    "Única, ligada al primer año natural completo posterior al inicio habitual.",
  deadline:
    "Junto con la última declaración de IVA del primer año natural completo posterior al inicio habitual.",
  channel: "Formulario electrónico con datos separados por Administración.",
  result:
    "Regularización que puede producir ingreso o devolución entre Administraciones según el caso.",
  included: [
    "Periodos anteriores al inicio habitual.",
    "Proporción provisional y definitiva.",
    "Administración estatal y Diputaciones forales.",
    "Cuotas soportadas, devoluciones y variación aplicable.",
  ],
  excluded: [
    "Autoliquidación periódica ordinaria del 303.",
    "Cualquier alta censal de autónomo.",
    "Grupo de IVA sin este supuesto.",
    "Reparto territorial no amparado por el Concierto.",
  ],
  preparation: [
    "Identificar la primera operación habitual.",
    "Calcular proporciones provisional y definitiva.",
    "Conciliar cuotas soportadas y devoluciones.",
    "Separar datos por Administración competente.",
  ],
  correction:
    "Presenta complementaria o sustitutiva conforme al trámite, conservando el cálculo de proporciones y las declaraciones de IVA relacionadas.",
  procedureSourceId: "aeat.model-318.procedure-home.2026-06-01",
  recordSourceId: "aeat.model-318.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-318.form-help.2026-06-19",
  legalSourceIds: ["boe.model-318.order-hac-1270-2019.original"],
  related: [
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description: "Autoliquidación periódica ordinaria del IVA.",
    },
    {
      code: "322",
      href: "/consultor-fiscal/modelos/322",
      description: "Autoliquidación individual de entidades en grupo de IVA.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta cualquier autónomo nuevo?",
      answer:
        "No. Solo quien encaja en la regularización territorial específica entre Administración estatal y foral.",
    },
    {
      question: "¿Qué significa el cambio del 40 %?",
      answer:
        "Es el umbral de variación previsto para determinados supuestos; debe compararse la proporción provisional con la definitiva conforme a la norma.",
    },
  ],
});

export const MODEL_319_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "319",
  category: "IVA · Hidrocarburos",
  statusLabel: "Nuevo en 2026 · Antes de la extracción",
  statusTone: "current",
  effectiveYear: 2026,
  firstFilingDate: "2026-01-01",
  intro: [
    "El Modelo 319 instrumenta un pago a cuenta del IVA para determinadas extracciones de gasolinas, gasóleos y biocarburantes desde depósitos distintos de los aduaneros.",
    "Es un procedimiento nuevo y sectorial: no lo presenta una gasolinera ordinaria por vender combustible y no funciona como una autoliquidación periódica.",
  ],
  notices: [
    {
      title: "Presentación previa y pago simultáneo",
      paragraphs: [
        "Debe tramitarse antes de la extracción. El importe general se vincula al 110 % de la cuota de IVA, aplicando exactamente las reglas y excepciones del procedimiento.",
      ],
    },
  ],
  type: "Pago a cuenta previo de IVA sobre determinadas extracciones.",
  presenter:
    "Depositante u operador obligado en la extracción comprendida desde un depósito fiscal distinto del aduanero.",
  nonPresenter:
    "Una estación de servicio por la venta ordinaria de combustible o un operador fuera del supuesto de depósito y extracción.",
  periodicity:
    "Por extracción o agrupación admitida; no es mensual ni trimestral ordinaria.",
  deadline:
    "Antes de la extracción, con pago simultáneo; primera aplicación y reglas operativas desde 2026.",
  channel:
    "Presentación electrónica previa, vinculada a producto, instalación, fecha, hora y pago.",
  result:
    "Pago a cuenta, generalmente el 110 % de la cuota de IVA correspondiente conforme al procedimiento.",
  included: [
    "Depósito fiscal, CAE H7, depositante y titular.",
    "Gasolinas, gasóleos y biocarburantes afectados.",
    "Producto, cantidad, fecha, hora e instalación.",
    "Base, tipo de IVA, 110 %, reparto estatal/foral y operador confiable.",
  ],
  excluded: [
    "Venta minorista ordinaria en gasolinera.",
    "Autoliquidación periódica completa del IVA.",
    "Extracción fuera del supuesto legal.",
    "Garantía u operador confiable inferidos sin acreditación.",
  ],
  preparation: [
    "Identificar depósito, CAE H7 y sujetos.",
    "Clasificar producto y cantidad.",
    "Calcular la cuota y el 110 % aplicable.",
    "Verificar operador confiable, garantías y reparto territorial.",
  ],
  correction:
    "Antes de extraer, corrige los datos por el cauce habilitado; después, aplica el procedimiento oficial sin alterar retroactivamente producto, hora o pago.",
  procedureSourceId: "aeat.model-319.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-319.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-319.instructions.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "FAQ oficial de hidrocarburos",
      sourceId: "aeat.hydrocarbons.faq.2026-04-06",
    },
  ],
  legalSourceIds: ["boe.model-319.order-hac-1495-2025.original"],
  related: [
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description:
        "Autoliquidación periódica del IVA en la que se regulariza lo que corresponda.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta una estación de servicio?",
      answer:
        "No por su venta ordinaria. Solo si actúa como sujeto obligado en una extracción comprendida por el procedimiento.",
    },
    {
      question: "¿Puede presentarse después de la extracción?",
      answer:
        "La regla es presentación y pago antes de extraer; una incidencia posterior debe tratarse por el cauce oficial.",
    },
  ],
});

export const MODEL_322_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "322",
  category: "IVA · Grupo de entidades",
  statusLabel: "Mensual · Modelo individual",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 322 es la autoliquidación mensual individual de cada entidad incluida en un grupo de IVA.",
    "Cada entidad presenta su 322 y la dominante agrega después los resultados mediante el Modelo 353; no es el grupo fiscal de Sociedades.",
  ],
  notices: [
    {
      title: "Individual 322 y agregado 353",
      paragraphs: [
        "Debe distinguirse la modalidad básica de la avanzada, las operaciones intragrupo y el resultado que se integra en el agregado del grupo.",
      ],
    },
  ],
  type: "Autoliquidación mensual individual de IVA.",
  presenter:
    "Cada entidad dominante o dependiente incluida en un grupo de entidades de IVA.",
  nonPresenter:
    "Cualquier sociedad de un grupo mercantil o fiscal que no pertenezca al régimen especial de grupo de IVA.",
  periodicity: "Mensual.",
  deadline:
    "Del 1 al 30 del mes siguiente; la declaración de enero se presenta hasta el último día de febrero.",
  channel:
    "Exclusivamente por internet con certificado, mediante formulario o carga por lotes cuando esté admitida.",
  result:
    "Ingreso, compensación, devolución o transferencia del resultado individual al agregado 353.",
  included: [
    "IVA devengado y deducible de la entidad.",
    "Importaciones, compensaciones y operaciones intragrupo.",
    "Modalidad básica o avanzada y base especial.",
    "SII, resultado individual y enlace con el 353.",
  ],
  excluded: [
    "Autoliquidación ordinaria del 303 de una entidad fuera del grupo.",
    "Agregado del grupo del 353.",
    "Grupo fiscal de Sociedades.",
    "Comunicación censal del grupo del 039.",
  ],
  preparation: [
    "Confirmar inclusión y modalidad del grupo.",
    "Conciliar libros/SII de la entidad.",
    "Separar operaciones intragrupo.",
    "Coordinar resultados individuales con la dominante.",
  ],
  correction:
    "Corrige el 322 por el cauce oficial y revisa simultáneamente el agregado 353 afectado; no modifiques uno sin conciliar el otro.",
  procedureSourceId: "aeat.model-322.procedure-home.2026-02-13",
  recordSourceId: "aeat.model-322.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-322.form-help.2026-02-01",
  additionalOfficialLinks: [
    {
      label: "Ayuda de presentación por lotes",
      sourceId: "aeat.declarations.batch-upload-help.2026-01-09",
    },
  ],
  legalSourceIds: ["boe.model-322.order-eha-3434-2007.original"],
  related: [
    {
      code: "039",
      href: "/consultor-fiscal/modelos/039",
      description: "Comunicaciones censales del grupo de IVA.",
    },
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description: "Autoliquidación ordinaria del IVA.",
    },
    {
      code: "353",
      href: "/consultor-fiscal/modelos/353",
      description: "Autoliquidación mensual agregada del grupo.",
    },
    {
      code: "390",
      href: "/consultor-fiscal/modelos/390",
      description: "Resumen anual del IVA cuando corresponda.",
    },
  ],
  specificFaq: [
    {
      question: "¿Quién presenta cada Modelo 322?",
      answer:
        "Cada entidad del grupo presenta su autoliquidación individual; la dominante presenta además el agregado 353.",
    },
    {
      question: "¿Se presenta el 303 además?",
      answer:
        "La entidad usa el 322 por su pertenencia al grupo para esos periodos, no duplica la misma autoliquidación en el 303.",
    },
  ],
});
