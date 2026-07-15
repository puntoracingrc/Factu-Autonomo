import { createBatch4PracticalGuideV1 } from "./create-batch-4-practical-guide.v1";

const ENVIRONMENTAL_CATEGORY = "Impuestos medioambientales";

export const MODEL_586_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "586",
  category: ENVIRONMENTAL_CATEGORY,
  statusLabel: "Histórico · Operaciones hasta el 31 de agosto de 2022",
  statusTone: "historical",
  intro: [
    "El Modelo 586 fue la declaración recapitulativa de operaciones con gases fluorados correspondiente al régimen anterior.",
    "La sede limita este modelo a operaciones realizadas hasta el 31 de agosto de 2022; no debe utilizarse como declaración vigente de 2026.",
  ],
  notices: [
    {
      title: "Modelo histórico",
      paragraphs: [
        "Consulta o corrige únicamente operaciones incluidas en su ámbito temporal. Para el impuesto actual revisa el Modelo 587 y el periodo concreto.",
      ],
    },
  ],
  type: "Declaración recapitulativa histórica de gases fluorados.",
  presenter:
    "Operador obligado por el régimen anterior respecto de operaciones realizadas hasta el 31 de agosto de 2022.",
  nonPresenter:
    "Operador de periodos posteriores o persona sin operaciones comprendidas en el antiguo régimen.",
  periodicity:
    "La correspondiente al régimen histórico, solo para los periodos admitidos.",
  deadline:
    "El plazo histórico del ejercicio afectado; no existe campaña ordinaria 2026 para nuevas operaciones.",
  channel:
    "Consulta o corrección en el procedimiento histórico oficial, sin trasladarlo al sistema vigente.",
  result:
    "Información histórica de operaciones; no crea una autoliquidación vigente.",
  included: [
    "Operaciones hasta el 31 de agosto de 2022.",
    "Productos, cantidades, adquirentes y claves del diseño histórico.",
    "Correcciones de periodos antiguos admitidos.",
  ],
  excluded: [
    "Operaciones desde septiembre de 2022.",
    "Autoliquidación actual del Modelo 587.",
    "Presentación ordinaria de 2026.",
  ],
  preparation: [
    "Confirmar fecha de cada operación.",
    "Recuperar diseño y claves del ejercicio.",
    "Conciliar cantidades y adquirentes.",
    "Documentar el motivo de la corrección histórica.",
  ],
  correction:
    "Corrige el periodo histórico por el cauce que conserve la AEAT; no migres la operación al 587 sin comprobar el hecho imponible y la fecha.",
  procedureSourceId: "aeat.model-586.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-586.procedure-record.2026-06-09",
  legalSourceIds: ["boe.order-hac-235-2019.original"],
  related: [
    {
      code: "587",
      href: "/consultor-fiscal/modelos/587",
      description:
        "Autoliquidación vigente del impuesto sobre gases fluorados.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puedo usarlo para una operación de 2026?",
      answer:
        "No. El 586 queda limitado a operaciones realizadas hasta el 31 de agosto de 2022.",
    },
    {
      question: "¿El 587 lo sustituye para cualquier corrección?",
      answer:
        "No automáticamente. Las operaciones históricas mantienen su periodo y procedimiento propios.",
    },
  ],
  allowProcedureAction: false,
  readOnlyActionLabel: "Consultar el procedimiento histórico del Modelo 586",
});

export const MODEL_587_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "587",
  category: ENVIRONMENTAL_CATEGORY,
  statusLabel: "Gases fluorados · Rectificativa desde julio de 2026",
  statusTone: "current",
  transitionYear: 2026,
  intro: [
    "El Modelo 587 autoliquida el Impuesto sobre los Gases Fluorados de Efecto Invernadero en los supuestos y periodos del régimen vigente.",
    "Para periodos iniciados desde el 1 de julio de 2026 incorpora la autoliquidación rectificativa; los periodos anteriores conservan su sistema de corrección.",
  ],
  notices: [
    {
      title: "La fecha del periodo decide cómo corregir",
      paragraphs: [
        "No apliques la rectificativa nueva a un periodo anterior al 1 de julio de 2026 ni reutilices el mecanismo antiguo para los posteriores.",
      ],
    },
  ],
  type: "Autoliquidación del impuesto sobre gases fluorados.",
  presenter:
    "Fabricante, importador, adquirente intracomunitario, almacenista u otro contribuyente comprendido en el impuesto.",
  nonPresenter:
    "Usuario final o empresa por adquirir un equipo con gas sin realizar el hecho imponible que la convierte en contribuyente.",
  periodicity:
    "Trimestral con las especialidades del sujeto y de la operación.",
  deadline:
    "Dentro de los primeros 20 días naturales del mes siguiente al trimestre, con la domiciliación y excepciones del calendario vigente.",
  channel:
    "Formulario electrónico, con contabilidad, existencias y documentación aduanera cuando procedan.",
  result:
    "Cuota a ingresar o rectificación del periodo conforme al potencial de calentamiento y tipo vigente.",
  included: [
    "Gas, cantidad y potencial de calentamiento atmosférico.",
    "Fabricación, importación, adquisición, almacenamiento y supuestos sujetos.",
    "Exenciones, devoluciones y documentación acreditativa.",
  ],
  excluded: [
    "Operaciones históricas del 586.",
    "Importación ya liquidada exclusivamente por Aduanas sin duplicación.",
    "Rectificativa 2026 aplicada a periodos anteriores.",
  ],
  preparation: [
    "Identificar sujeto y operación.",
    "Clasificar gas y cantidad.",
    "Conciliar existencias, contabilidad y Aduanas.",
    "Fijar fecha para elegir corrección.",
  ],
  correction:
    "Para periodos iniciados desde el 1 de julio de 2026 utiliza la autoliquidación rectificativa; para anteriores conserva el procedimiento aplicable a su fecha.",
  procedureSourceId: "aeat.model-587.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-587.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-587.information-faq.2026-07-08",
  document: {
    label: "Formulario e instrucciones oficiales del Modelo 587",
    sourceId: "aeat.model-587.instructions-pdf.2015-02-06",
  },
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes oficiales del impuesto",
      sourceId: "aeat.model-587.faq-pdf.2024-04-04",
    },
  ],
  legalSourceIds: [
    "boe.order-hfp-826-2022.original",
    "boe.order-hac-56-2026.original",
  ],
  related: [
    {
      code: "586",
      href: "/consultor-fiscal/modelos/586",
      description:
        "Declaración recapitulativa del régimen anterior hasta agosto de 2022.",
    },
  ],
  specificFaq: [
    {
      question: "¿Desde cuándo se usa la rectificativa?",
      answer:
        "Para periodos impositivos que se inicien desde el 1 de julio de 2026.",
    },
    {
      question: "¿Cómo se corrige un periodo anterior?",
      answer:
        "Con el sistema que resulte aplicable a ese periodo, no con la rectificativa nueva por defecto.",
    },
  ],
});

export const MODEL_592_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "592",
  category: ENVIRONMENTAL_CATEGORY,
  statusLabel: "Envases de plástico no reutilizables · Vigente desde 2023",
  statusTone: "current",
  effectiveYear: 2023,
  intro: [
    "El Modelo 592 autoliquida el Impuesto especial sobre los envases de plástico no reutilizables por fabricación y determinadas adquisiciones intracomunitarias.",
    "En las importaciones la liquidación se realiza por Aduanas, por lo que no deben duplicarse en el formulario periódico.",
  ],
  notices: [
    {
      title: "La base es plástico no reciclado",
      paragraphs: [
        "La base se expresa en kilogramos de plástico no reciclado y exige certificado o documentación válida del contenido reciclado. El tipo y las reglas deben comprobarse para el periodo.",
      ],
    },
  ],
  type: "Autoliquidación del impuesto sobre envases de plástico no reutilizables.",
  presenter:
    "Fabricante o adquirente intracomunitario que realiza operaciones sujetas y no exentas.",
  nonPresenter:
    "Importador respecto de la cuota liquidada por Aduanas, ni adquirente que solo compra el producto dentro de España.",
  periodicity:
    "Mensual o trimestral, normalmente alineada con el periodo de IVA del contribuyente.",
  deadline:
    "Primeros 20 días naturales del mes siguiente al periodo, con reglas específicas de domiciliación y calendario.",
  channel:
    "Formulario electrónico y, cuando proceda, libros contables o registros de existencias en sede.",
  result:
    "Cuota sobre kilogramos de plástico no reciclado, aplicando exenciones y devoluciones acreditadas; el tipo legal de referencia es 0,45 euros por kilogramo.",
  included: [
    "Fabricación y adquisición intracomunitaria sujetas.",
    "Kilogramos totales, contenido reciclado acreditado y base no reciclada.",
    "Exenciones, devoluciones y registros exigibles.",
  ],
  excluded: [
    "Importaciones liquidadas por Aduanas.",
    "Plástico reciclado acreditado incluido en la base.",
    "Adquisición intracomunitaria por debajo del umbral mensual de 5 kilogramos, cuando resulte aplicable.",
  ],
  preparation: [
    "Clasificar envase y operación.",
    "Pesar plástico y acreditar contenido reciclado.",
    "Conciliar fabricación, adquisiciones y Aduanas.",
    "Revisar exenciones, devoluciones y periodo.",
  ],
  correction:
    "Corrige el periodo afectado con los certificados y registros de peso; no dupliques cuotas de importación ni cambies el contenido reciclado sin evidencia.",
  procedureSourceId: "aeat.model-592.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-592.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-592.topic.2026-07-08",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes oficiales del impuesto",
      sourceId: "aeat.model-592.faq-pdf",
    },
    {
      label: "Formato electrónico de libros y existencias",
      sourceId: "aeat.model-592.format-pdf",
    },
  ],
  legalSourceIds: ["boe.order-hfp-1314-2022.original"],
  related: [
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description:
        "Autoliquidación periódica del IVA, con periodo que puede servir de referencia.",
    },
    {
      code: "349",
      href: "/consultor-fiscal/modelos/349",
      description:
        "Declaración de operaciones intracomunitarias, distinta del impuesto sobre envases.",
    },
    {
      code: "593",
      href: "/consultor-fiscal/modelos/593",
      description: "Impuesto sobre depósito e incineración de residuos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cómo se declaran las importaciones?",
      answer:
        "La cuota de importación se liquida por Aduanas y no debe duplicarse en el 592 periódico.",
    },
    {
      question: "¿Qué cantidad forma la base?",
      answer:
        "Los kilogramos de plástico no reciclado, determinados con documentación o certificación válida.",
    },
  ],
});

export const MODEL_593_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "593",
  category: ENVIRONMENTAL_CATEGORY,
  statusLabel: "Residuos · Vigente desde 2023 y gestión territorial",
  statusTone: "current",
  effectiveYear: 2023,
  intro: [
    "El Modelo 593 autoliquida el Impuesto sobre el depósito de residuos en vertederos, la incineración y la coincineración.",
    "La gestión puede estar asumida por una comunidad autónoma: territorio, instalación, residuo y periodo deben comprobarse antes de elegir administración, tarifa y canal.",
  ],
  notices: [
    {
      title: "No existe una única respuesta territorial",
      paragraphs: [
        "La sede estatal no sustituye los portales y reglas de las comunidades que hayan asumido la gestión. Tampoco existe un tipo único para todos los residuos e instalaciones.",
      ],
    },
  ],
  type: "Autoliquidación del impuesto sobre depósito, incineración y coincineración de residuos.",
  presenter:
    "Gestor de vertedero, instalación de incineración o coincineración, u otro contribuyente definido para la operación sujeta.",
  nonPresenter:
    "Productor del residuo por esa sola condición cuando no es el contribuyente del hecho imponible, ni operador fuera del territorio de gestión elegido.",
  periodicity: "Trimestral, salvo especialidad territorial aplicable.",
  deadline:
    "Primeros 30 días naturales del mes siguiente al trimestre en el ámbito estatal, comprobando calendario y reglas de la comunidad competente.",
  channel:
    "Formulario estatal o canal de la comunidad autónoma competente, con instalación, códigos, peso y tratamiento.",
  result:
    "Cuota determinada por peso, tipo de residuo, instalación, tratamiento y tarifa territorial vigente.",
  included: [
    "Depósito en vertedero, incineración y coincineración sujetos.",
    "Toneladas, códigos de residuo, instalación y tratamiento.",
    "Exenciones y supuestos acreditados, territorio y tarifa.",
  ],
  excluded: [
    "Modelo estatal cuando la gestión corresponde a otro portal territorial.",
    "Tipo único aplicado a todo residuo.",
    "Confundir productor del residuo con contribuyente sin revisar el hecho imponible.",
  ],
  preparation: [
    "Determinar territorio competente.",
    "Identificar instalación y contribuyente.",
    "Clasificar y pesar residuos.",
    "Aplicar tarifa y exención versionadas.",
  ],
  correction:
    "Corrige ante la administración competente y con la tarifa del periodo; no traslades una autoliquidación entre territorios sin verificar competencia.",
  procedureSourceId: "aeat.model-593.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-593.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-593.topic.2026-07-08",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes oficiales del impuesto",
      sourceId: "aeat.model-593.faq-pdf",
    },
    {
      label: "Códigos y documentación técnica oficial",
      sourceId: "aeat.model-593.type-codes-pdf",
    },
  ],
  legalSourceIds: ["boe.order-hfp-1337-2022.original"],
  related: [
    {
      code: "592",
      href: "/consultor-fiscal/modelos/592",
      description: "Impuesto sobre envases de plástico no reutilizables.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta siempre ante la AEAT?",
      answer:
        "No. Debe comprobarse si la comunidad autónoma competente ha asumido la gestión y cuál es su canal.",
    },
    {
      question: "¿Hay un tipo único?",
      answer:
        "No. Varía según residuo, instalación, tratamiento, territorio y periodo.",
    },
  ],
});
