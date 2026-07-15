import { createBatch5PracticalGuideV1 } from "./create-batch-5-practical-guide.v1";

const CATEGORY = "Tributos patrimoniales, tasas y obligaciones sectoriales";

export const MODEL_602_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "602",
  category: CATEGORY,
  statusLabel: "Tasa administrativa sectorial",
  statusTone: "current",
  intro: [
    "El Modelo 602 paga las tasas asociadas a determinados procedimientos, licencias, autorizaciones, registros o actuaciones administrativas de juego estatal.",
    "No es el impuesto sobre la actividad de juego, no lo presenta un jugador y la tarifa depende de la actuación solicitada.",
  ],
  notices: [
    {
      title: "Distingue la fecha de devengo",
      paragraphs: [
        "Los hechos imponibles devengados desde el 31 de diciembre de 2020 se autoliquidan ante la AEAT; los anteriores siguen el cauce histórico de la Dirección General de Ordenación del Juego.",
      ],
    },
  ],
  type: "Tasa administrativa no periódica",
  presenter:
    "El operador, solicitante o entidad del sector que pide o recibe el servicio administrativo estatal gravado.",
  nonPresenter:
    "El jugador, el cliente o una empresa por organizar cualquier promoción; tampoco quien debe una tasa autonómica.",
  periodicity:
    "No periódica; se devenga con la solicitud o actuación administrativa.",
  deadline:
    "En el momento o plazo ligado al servicio, autorización, licencia, inscripción, certificación o inspección concreta.",
  channel:
    "Autoliquidación AEAT para devengos actuales y cauce DGOJ para los anteriores al cambio; verifica código de tasa e importe vigente.",
  result:
    "Cantidad a ingresar y justificante administrativo; no concede por sí solo la licencia o autorización.",
  included: [
    "Licencias, autorizaciones, inscripciones, certificaciones o actuaciones estatales gravadas.",
    "Código de tasa, hecho imponible, devengo e importe vigente.",
  ],
  excluded: [
    "Impuesto trimestral sobre actividades de juego del 763.",
    "Apuestas/promociones del 685.",
    "Retenciones sobre premios o tasas autonómicas.",
  ],
  preparation: [
    "Solicitud o expediente y código de tasa.",
    "Fecha de devengo y actuación exacta.",
    "Tarifa oficial vigente, pago/NRC y documentación de soporte.",
  ],
  commonMistakes: [
    "Aplicar una tarifa única.",
    "Confundir tasa administrativa e impuesto de juego.",
    "Usar el cauce actual para un devengo anterior a 2021.",
  ],
  correction:
    "Revisa el expediente y solicita rectificación o devolución si pagaste indebidamente; una cuota insuficiente se regulariza por el cauce oficial aplicable.",
  procedureSourceId: "aeat.model-602.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-602.procedure-record.2026-07-14",
  legalSourceIds: ["boe.order-hac-1277-2020.consolidated.2026-07-14"],
  related: [
    {
      code: "685",
      href: "/consultor-fiscal/modelos/685",
      description: "Tasa estatal sobre apuestas y combinaciones aleatorias.",
    },
    {
      code: "763",
      href: "/consultor-fiscal/modelos/763",
      description:
        "Impuesto sobre actividades de operadores estatales de juego.",
    },
    {
      code: "043",
      href: "/consultor-fiscal/modelos/043",
      description: "Impuesto sobre premios de determinados juegos.",
    },
    {
      code: "044",
      href: "/consultor-fiscal/modelos/044",
      description: "Casinos de juego.",
    },
    {
      code: "045",
      href: "/consultor-fiscal/modelos/045",
      description: "Máquinas o aparatos automáticos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta un jugador?",
      answer:
        "No. Se dirige al solicitante u operador del procedimiento administrativo gravado.",
    },
    {
      question: "¿Existe una cantidad única?",
      answer:
        "No. El importe depende del código y tipo de actuación, por lo que debe consultarse la tarifa vigente.",
    },
    {
      question: "¿Qué diferencia tiene con el 763?",
      answer:
        "El 602 paga un servicio administrativo; el 763 autoliquida la actividad de juego del operador.",
    },
  ],
});

export const MODEL_604_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "604",
  category: CATEGORY,
  statusLabel: "Mensual · anexo informativo previo",
  statusTone: "current",
  effectiveYear: 2021,
  intro: [
    "El Modelo 604 autoliquida mensualmente el Impuesto sobre las Transacciones Financieras de determinadas adquisiciones onerosas de acciones de sociedades españolas cotizadas.",
    "El contribuyente es el adquirente, pero la presentación suele recaer en el intermediario, depositario o entidad definida por la operación; antes debe enviarse el anexo informativo.",
  ],
  notices: [
    {
      title: "No grava cualquier inversión en bolsa",
      paragraphs: [
        "La sociedad debe superar 1.000 millones de euros de capitalización en la fecha legal y figurar en la relación anual. El tipo general es 0,2 %, con exenciones que deben comprobarse operación por operación.",
      ],
    },
  ],
  type: "Autoliquidación mensual",
  presenter:
    "El depositario central, intermediario, entidad financiera o sujeto pasivo determinado por la cadena de ejecución/liquidación; no normalmente el inversor minorista directamente.",
  nonPresenter:
    "El inversor minorista por el mero hecho de comprar acciones, ni quien adquiere títulos no incluidos o en una operación exenta.",
  periodicity: "Mensual.",
  deadline:
    "Plazo ordinario del día 10 al 20 del mes siguiente. El anexo informativo debe presentarse previamente.",
  channel:
    "Anexo informativo con diseño de registro y después autoliquidación electrónica; puede existir presentación sin ingreso cuando proceda.",
  result:
    "Ingreso del 0,2 % sobre la base sujeta, o declaración sin ingreso, con trazabilidad individual de operaciones.",
  included: [
    "Adquisiciones onerosas de acciones españolas cotizadas de sociedades que superan el umbral anual.",
    "Ciertas adquisiciones indirectas, certificados de depósito y resultados de conversión/canje/derivados.",
    "Identificador de operación, fecha de liquidación, intermediarios, base y exención.",
  ],
  excluded: [
    "Cualquier acción extranjera o sociedad española fuera de la lista.",
    "Comisiones de compraventa.",
    "Mercado primario, reestructuraciones, intragrupo, creación de mercado y otras exenciones cuando se cumplen.",
  ],
  preparation: [
    "Relación anual de sociedades con capitalización superior a 1.000 millones.",
    "Anexo informativo, identificadores y diseño de registro vigente.",
    "Fecha de liquidación, base, adquirente/sujeto pasivo y prueba de exenciones.",
  ],
  commonMistakes: [
    "Presentar el 604 antes del anexo.",
    "Cargar el impuesto a cualquier acción española.",
    "Confundir contribuyente e intermediario presentador.",
  ],
  correction:
    "Corrige primero los registros del anexo y después presenta complementaria o solicita rectificación del 604, manteniendo la correspondencia entre ambos.",
  procedureSourceId: "aeat.model-604.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-604.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-604.faq.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Diseños de registro del anexo informativo",
      sourceId: "aeat.model-604.register-designs.2026-07-14",
    },
  ],
  legalSourceIds: [
    "boe.law-5-2020.consolidated.2026-07-14",
    "boe.order-hac-510-2021.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "187",
      href: "/consultor-fiscal/modelos/187",
      description:
        "Información sobre acciones y participaciones en instituciones de inversión colectiva.",
    },
    {
      code: "189",
      href: "/consultor-fiscal/modelos/189",
      description: "Valores, seguros y rentas.",
    },
    {
      code: "198",
      href: "/consultor-fiscal/modelos/198",
      description: "Operaciones con activos financieros.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuál es el tipo?",
      answer:
        "El tipo general legal es el 0,2 %; no sustituye la comprobación de sujeción, base y exención.",
    },
    {
      question: "¿Cómo sé qué sociedades están incluidas?",
      answer:
        "La AEAT publica cada año la relación de sociedades españolas que superan el umbral legal de capitalización.",
    },
    {
      question: "¿Qué es el anexo informativo?",
      answer:
        "Es el envío previo y detallado de operaciones, con identificadores y diseño de registro, que precede a la autoliquidación mensual.",
    },
  ],
});

const RADIOACTIVE_LEGAL = [
  "boe.order-eha-408-2010.consolidated.2026-07-14",
] as const;

export const MODEL_681_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "681",
  category: CATEGORY,
  statusLabel: "Sector eléctrico · muy especializado",
  statusTone: "current",
  intro: [
    "El Modelo 681 ingresa la tasa vinculada a determinados servicios de gestión de residuos radiactivos financiados con importes recaudados en el sistema eléctrico.",
    "Lo presentan las entidades que actúan como sustitutos del contribuyente; nunca el consumidor de electricidad.",
  ],
  notices: [
    {
      title: "Parte de liquidaciones del sistema, no de una factura aislada",
      paragraphs: [
        "La base exige identificar peajes o importes recaudados y la liquidación regulada. No debe reconstruirse sin la documentación del sistema eléctrico.",
      ],
    },
  ],
  type: "Autoliquidación mensual de tasa",
  presenter:
    "Entidades distribuidoras, transportistas u otros sustitutos del contribuyente expresamente obligados por la regulación.",
  nonPresenter:
    "El consumidor, un productor eléctrico ordinario o el titular de una instalación por el mero consumo.",
  periodicity: "Mensual.",
  deadline:
    "Antes del día 10 del segundo mes siguiente al periodo, conforme a la regulación del modelo.",
  channel:
    "Presentación electrónica e ingreso con las liquidaciones oficiales del sistema.",
  result:
    "Cuota a ingresar para financiar servicios de gestión de residuos radiactivos.",
  included: [
    "Peajes/importes recaudados incluidos en la base.",
    "Sustituto, periodo, base, coeficiente y cuota.",
  ],
  excluded: [
    "Factura individual del consumidor.",
    "Impuestos nucleares 584/585.",
    "Tasas 682–684 por instalaciones/residuos distintos.",
  ],
  preparation: [
    "Liquidación del sistema eléctrico.",
    "Importes efectivamente recaudados y periodo.",
    "Identificación del sustituto y conciliación contable.",
  ],
  commonMistakes: [
    "Atribuirlo al consumidor.",
    "Confundirlo con el impuesto nuclear 584.",
    "Calcularlo sin liquidación del sistema.",
  ],
  correction:
    "Corrige la autoliquidación con la liquidación regulatoria rectificada y conserva la trazabilidad del periodo.",
  procedureSourceId: "aeat.model-681.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-681.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-681.help.2026-07-14",
  legalSourceIds: [
    ...RADIOACTIVE_LEGAL,
    "boe.order-eha-1259-2011.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "682",
      href: "/consultor-fiscal/modelos/682",
      description:
        "Tasa de centrales nucleares por combustible gastado y residuos.",
    },
    {
      code: "683",
      href: "/consultor-fiscal/modelos/683",
      description: "Tasa anual de instalaciones de fabricación de combustible.",
    },
    {
      code: "684",
      href: "/consultor-fiscal/modelos/684",
      description: "Tasa por retirada de residuos de otras instalaciones.",
    },
    {
      code: "584",
      href: "/consultor-fiscal/modelos/584",
      description: "Impuesto sobre combustible nuclear gastado y residuos.",
    },
    {
      code: "585",
      href: "/consultor-fiscal/modelos/585",
      description: "Pago fraccionado del impuesto nuclear relacionado.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el consumidor?",
      answer:
        "No. Lo presentan sustitutos del contribuyente definidos por la regulación del sistema eléctrico.",
    },
    {
      question: "¿Qué diferencia hay con el 682?",
      answer:
        "El 681 parte de importes recaudados en el sistema; el 682 grava el servicio de gestión de combustible/residuos de centrales nucleares.",
    },
  ],
});

export const MODEL_682_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "682",
  category: CATEGORY,
  statusLabel: "Centrales nucleares · muy especializado",
  statusTone: "current",
  intro: [
    "El Modelo 682 liquida la tasa destinada a gestionar combustible nuclear gastado y residuos radiactivos generados por centrales nucleares.",
    "Afecta únicamente a titulares o explotadores incluidos y no a productores eléctricos ordinarios.",
  ],
  notices: [
    {
      title: "Distingue tasa e impuesto nuclear",
      paragraphs: [
        "El Modelo 682 financia un servicio de gestión; el 584 corresponde a una figura tributaria diferente. El periodo es mensual y su plazo especial abarca los tres meses naturales siguientes.",
      ],
    },
  ],
  type: "Autoliquidación mensual de tasa",
  presenter: "El titular o explotador de la central nuclear sujeto a la tasa.",
  nonPresenter:
    "Un productor de energía no nuclear, el consumidor o una instalación de fabricación de combustible.",
  periodicity: "Mensual.",
  deadline:
    "Durante los tres meses naturales siguientes al periodo de liquidación.",
  channel:
    "Presentación electrónica e ingreso/NRC con magnitudes reguladas de la central.",
  result:
    "Cuota de la tasa a ingresar; un cese anticipado puede abrir reglas específicas y pagos posteriores.",
  included: [
    "Combustible nuclear gastado y residuos de centrales.",
    "Producción/magnitud regulada, base, tarifa y cuota.",
    "Reglas especiales por cese anticipado y déficit cuando procedan.",
  ],
  excluded: [
    "Impuesto del 584.",
    "Residuos de fábricas del 683.",
    "Residuos de otras instalaciones del 684.",
  ],
  preparation: [
    "Identificación de central y titular/explotador.",
    "Producción y magnitudes reguladas del mes.",
    "Documentación de residuos, cese y déficit si existe.",
  ],
  commonMistakes: [
    "Usarlo para cualquier productor eléctrico.",
    "Confundir tasa con 584.",
    "Aplicar el plazo mensual ordinario de otro modelo.",
  ],
  correction:
    "Rectifica la magnitud regulada y usa complementaria o solicitud de rectificación conforme al resultado, conservando la documentación técnica.",
  procedureSourceId: "aeat.model-682.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-682.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-682.help.2026-07-14",
  legalSourceIds: [
    ...RADIOACTIVE_LEGAL,
    "boe.order-eha-1259-2011.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "681",
      href: "/consultor-fiscal/modelos/681",
      description:
        "Tasa vinculada a importes recaudados por el sistema eléctrico.",
    },
    {
      code: "683",
      href: "/consultor-fiscal/modelos/683",
      description: "Fabricación de elementos combustibles.",
    },
    {
      code: "684",
      href: "/consultor-fiscal/modelos/684",
      description: "Retirada de residuos de otras instalaciones.",
    },
    {
      code: "584",
      href: "/consultor-fiscal/modelos/584",
      description: "Impuesto nuclear distinto de esta tasa.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuál es el plazo?",
      answer:
        "La regulación del modelo extiende la presentación durante los tres meses naturales siguientes al periodo mensual.",
    },
    {
      question: "¿Qué ocurre con un cese anticipado?",
      answer:
        "Puede activar reglas de déficit y pagos específicos; debe revisarse la documentación y norma aplicable al cese.",
    },
  ],
});

export const MODEL_683_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "683",
  category: CATEGORY,
  statusLabel: "Fabricación nuclear · anual",
  statusTone: "current",
  intro: [
    "El Modelo 683 liquida la tasa por la gestión de residuos de instalaciones que fabrican elementos combustibles nucleares y por su futuro desmantelamiento.",
    "Es anual y no corresponde a una central nuclear ordinaria.",
  ],
  notices: [
    {
      title: "Instalaciones de fabricación únicamente",
      paragraphs: [
        "La base parte de la producción o magnitud regulada y puede requerir un tratamiento específico si la instalación cesa anticipadamente.",
      ],
    },
  ],
  type: "Autoliquidación anual de tasa",
  presenter:
    "El titular de una instalación de fabricación de elementos combustibles incluida en la regulación.",
  nonPresenter:
    "Una central nuclear, hospital, laboratorio o instalación sin fabricación de elementos combustibles.",
  periodicity: "Anual.",
  deadline: "Durante los tres primeros meses del año siguiente.",
  channel:
    "Presentación electrónica e ingreso con la producción y documentación regulada.",
  result:
    "Cuota anual; el cese puede originar pagos posteriores por déficit/desmantelamiento.",
  included: [
    "Producción de elementos combustibles.",
    "Residuos y costes futuros de desmantelamiento.",
    "Base, tarifa, cuota y reglas de cese.",
  ],
  excluded: [
    "Residuos de central nuclear 682.",
    "Otras instalaciones 684.",
    "Cualquier fabricante industrial no nuclear.",
  ],
  preparation: [
    "Autorización e identificación de la instalación.",
    "Producción anual y residuos.",
    "Cese, déficit y previsiones reguladas cuando existan.",
  ],
  commonMistakes: [
    "Presentarlo por una central.",
    "Tratarlo como mensual.",
    "Omitir la regla de cese.",
  ],
  correction:
    "Actualiza la magnitud anual y presenta complementaria o rectificación con respaldo técnico.",
  procedureSourceId: "aeat.model-683.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-683.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-683.help.2026-07-14",
  legalSourceIds: [...RADIOACTIVE_LEGAL],
  related: [
    {
      code: "682",
      href: "/consultor-fiscal/modelos/682",
      description: "Tasa mensual de centrales nucleares.",
    },
    {
      code: "684",
      href: "/consultor-fiscal/modelos/684",
      description: "Tasa por residuos de otras instalaciones.",
    },
    {
      code: "681",
      href: "/consultor-fiscal/modelos/681",
      description: "Tasa vinculada a peajes del sistema eléctrico.",
    },
  ],
  specificFaq: [
    {
      question: "¿Es anual?",
      answer:
        "Sí. Se presenta durante los tres primeros meses del año siguiente.",
    },
    {
      question: "¿Lo presenta una central nuclear?",
      answer:
        "No por ese solo hecho; esta ficha se refiere a instalaciones de fabricación de elementos combustibles.",
    },
  ],
});

export const MODEL_684_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "684",
  category: CATEGORY,
  statusLabel: "Retirada de residuos · 60 días",
  statusTone: "current",
  intro: [
    "El Modelo 684 liquida la tasa por la gestión y retirada de residuos radiactivos generados en instalaciones distintas de centrales y fábricas de combustible.",
    "Puede afectar a hospitales, laboratorios, industria o centros de investigación cuando ENRESA retira el residuo.",
  ],
  notices: [
    {
      title: "Solo residuos radiactivos gestionados por el sistema",
      paragraphs: [
        "No cubre cualquier residuo peligroso ni el impuesto general de residuos del 593. El plazo se cuenta desde la retirada documentada.",
      ],
    },
  ],
  type: "Autoliquidación de tasa por retirada",
  presenter:
    "El titular de la instalación que genera el residuo radiactivo retirado y gestionado por ENRESA.",
  nonPresenter:
    "Quien genera residuos peligrosos no radiactivos, una central del 682 o una fábrica del 683.",
  periodicity: "Por cada retirada o hecho sujeto.",
  deadline:
    "Dentro de los 60 días naturales siguientes a la retirada del residuo.",
  channel:
    "Presentación electrónica e ingreso con el documento de retirada y clasificación/magnitudes.",
  result: "Cuota a ingresar por el servicio de gestión/retirada.",
  included: [
    "Residuos radiactivos de hospitales, laboratorios, industria e investigación.",
    "Clasificación, volumen/actividad, fecha y documento de retirada.",
  ],
  excluded: [
    "Cualquier residuo peligroso.",
    "Impuesto sobre residuos 593.",
    "Combustible/residuos de centrales o fábricas 682/683.",
  ],
  preparation: [
    "Documento de ENRESA y fecha de retirada.",
    "Clasificación, volumen, actividad y tarifa.",
    "Identificación de la instalación y conciliación de residuos.",
  ],
  commonMistakes: [
    "Contar el plazo desde la generación y no la retirada.",
    "Confundir residuo radiactivo con peligroso.",
    "Usar el 593.",
  ],
  correction:
    "Corrige la clasificación o magnitud con el documento de retirada y presenta complementaria/rectificación según la cuota.",
  procedureSourceId: "aeat.model-684.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-684.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-684.help.2026-07-14",
  legalSourceIds: [
    ...RADIOACTIVE_LEGAL,
    "boe.order-eha-1259-2011.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "681",
      href: "/consultor-fiscal/modelos/681",
      description: "Tasa vinculada al sistema eléctrico.",
    },
    {
      code: "682",
      href: "/consultor-fiscal/modelos/682",
      description: "Residuos de centrales nucleares.",
    },
    {
      code: "683",
      href: "/consultor-fiscal/modelos/683",
      description: "Residuos de fabricación de combustible.",
    },
    {
      code: "593",
      href: "/consultor-fiscal/modelos/593",
      description:
        "Impuesto sobre depósito/incineración/coincineración de residuos, figura distinta.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuál es el plazo?",
      answer: "Sesenta días naturales desde la retirada del residuo.",
    },
    {
      question: "¿Qué documento entrega ENRESA?",
      answer:
        "La documentación de retirada acredita fecha, clasificación y magnitudes que deben conciliarse con la autoliquidación.",
    },
  ],
});

export const MODEL_685_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "685",
  category: CATEGORY,
  statusLabel: "Juego · competencia territorial",
  statusTone: "territorial",
  territorialGate: true,
  intro: [
    "El Modelo 685 autoliquida la tasa estatal sobre determinadas apuestas y combinaciones aleatorias promocionales cuando la gestión corresponde al Estado.",
    "No toda promoción o sorteo usa este modelo: hay que comprobar actividad, participación, premios, ámbito y competencia autonómica/estatal.",
  ],
  notices: [
    {
      title: "Periodo 0A y plazo desde el inicio",
      paragraphs: [
        "La autoliquidación estatal se presenta dentro de los 30 días siguientes al comienzo de la actividad o promoción. El tipo o cuota depende del supuesto.",
      ],
    },
  ],
  type: "Autoliquidación de tasa sobre juego",
  presenter:
    "El organizador de la apuesta o combinación aleatoria sujeta cuando la competencia de gestión es estatal.",
  nonPresenter:
    "El participante, el ganador, cualquier empresa que hace una promoción no sujeta o quien deba declarar ante una comunidad autónoma.",
  periodicity: "No periódica; periodo 0A por cada actividad o promoción.",
  deadline:
    "Dentro de los 30 días siguientes al comienzo de la actividad o promoción.",
  channel:
    "Presentación electrónica y pago ante la Administración competente, con autorización cuando proceda.",
  result: "Cuota a ingresar conforme a actividad, base/premios y tipo vigente.",
  included: [
    "Apuestas y combinaciones aleatorias promocionales sujetas.",
    "Organizador, fecha de inicio, ámbito territorial, premios y valor de mercado.",
    "Periodo 0A y autorización cuando corresponda.",
  ],
  excluded: [
    "Impuesto de operadores de juego 763.",
    "Tasa administrativa 602.",
    "Retenciones de premios 230/270.",
  ],
  preparation: [
    "Bases/promoción y fecha de inicio.",
    "Ámbito territorial, autorización y organizador.",
    "Valor de mercado de premios, base y tipo vigente.",
  ],
  commonMistakes: [
    "Presentarlo por cualquier sorteo.",
    "Contar 30 días desde el final.",
    "Ignorar competencia autonómica.",
  ],
  correction:
    "Presenta complementaria o solicita rectificación con la autorización, bases y valoración corregidas.",
  procedureSourceId: "aeat.model-685.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-685.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-685.help.2026-07-14",
  document: {
    label: "Formulario oficial PDF del Modelo 685",
    sourceId: "aeat.model-685.form-pdf.2026-07-14",
  },
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales PDF",
      sourceId: "aeat.model-685.instructions-pdf.2026-07-14",
    },
  ],
  legalSourceIds: ["boe.order-eha-388-2010.consolidated.2026-07-14"],
  related: [
    {
      code: "602",
      href: "/consultor-fiscal/modelos/602",
      description: "Tasa administrativa por procedimientos de juego.",
    },
    {
      code: "763",
      href: "/consultor-fiscal/modelos/763",
      description: "Impuesto trimestral de operadores estatales.",
    },
    {
      code: "043",
      href: "/consultor-fiscal/modelos/043",
      description: "Premios de determinados juegos.",
    },
    {
      code: "230",
      href: "/consultor-fiscal/modelos/230",
      description: "Retención especial sobre premios.",
    },
    {
      code: "270",
      href: "/consultor-fiscal/modelos/270",
      description: "Resumen anual de premios.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué significa periodo 0A?",
      answer:
        "Es la clave de periodo usada para esta autoliquidación no periódica, no un trimestre o mes.",
    },
    {
      question: "¿Cómo se valora el premio?",
      answer:
        "Con su valor de mercado y las reglas oficiales aplicables; no se presume por el coste publicitario.",
    },
  ],
});

export const MODEL_763_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "763",
  category: CATEGORY,
  statusLabel: "Operadores estatales de juego",
  statusTone: "current",
  intro: [
    "El Modelo 763 autoliquida trimestralmente el Impuesto sobre Actividades de Juego de determinadas actividades estatales autorizadas con duración anual o plurianual.",
    "Lo presenta el operador con título habilitante, no el jugador ni una empresa por realizar cualquier promoción.",
  ],
  notices: [
    {
      title: "Cada modalidad tiene su base y tipo",
      paragraphs: [
        "Apuestas, bingo, póquer, concursos, casino u otros juegos no comparten necesariamente la misma regla. También debe informarse el reparto territorial cuando proceda.",
      ],
    },
  ],
  type: "Autoliquidación trimestral",
  presenter:
    "El operador estatal de juego titular de licencia general/singular o título habilitante para actividades anuales o plurianuales.",
  nonPresenter:
    "El jugador, el ganador o una empresa sin título estatal por una promoción aislada.",
  periodicity: "Trimestral: 1T, 2T, 3T y 4T.",
  deadline: "Durante el mes natural siguiente a cada trimestre.",
  channel:
    "Presentación exclusivamente electrónica, con desglose por modalidad y territorio.",
  result: "Cuota a ingresar del Impuesto sobre Actividades de Juego.",
  included: [
    "Cantidades jugadas, premios e ingreso bruto/neto según modalidad.",
    "Bonos, licencias, residencia de jugadores y reparto territorial cuando proceda.",
    "Apuestas, bingo, póquer, concursos, casino y otros juegos autorizados.",
  ],
  excluded: [
    "Tasa administrativa 602.",
    "Combinaciones promocionales 685.",
    "Retenciones de premios.",
  ],
  preparation: [
    "Título habilitante y modalidades autorizadas.",
    "Cantidades jugadas, premios, bonos y base por modalidad.",
    "Residencia de jugadores y distribución común/foral.",
  ],
  commonMistakes: [
    "Aplicar un único tipo a todos los juegos.",
    "Incluir retenciones de premios.",
    "Omitir el reparto territorial.",
  ],
  correction:
    "Recalcula por modalidad y territorio y usa complementaria o rectificación electrónica del trimestre.",
  procedureSourceId: "aeat.model-763.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-763.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-763.help.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales PDF",
      sourceId: "aeat.model-763.instructions-pdf.2026-07-14",
    },
  ],
  legalSourceIds: ["boe.order-eha-1881-2011.consolidated.2026-07-14"],
  related: [
    {
      code: "602",
      href: "/consultor-fiscal/modelos/602",
      description: "Tasas administrativas de juego.",
    },
    {
      code: "685",
      href: "/consultor-fiscal/modelos/685",
      description: "Apuestas y combinaciones aleatorias promocionales.",
    },
    {
      code: "043",
      href: "/consultor-fiscal/modelos/043",
      description: "Impuesto sobre premios de loterías/apuestas.",
    },
    {
      code: "044",
      href: "/consultor-fiscal/modelos/044",
      description: "Tasa fiscal de casinos.",
    },
    {
      code: "045",
      href: "/consultor-fiscal/modelos/045",
      description: "Máquinas o aparatos automáticos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Es trimestral?",
      answer: "Sí: 1T, 2T, 3T y 4T, durante el mes natural siguiente.",
    },
    {
      question: "¿Existe un único tipo?",
      answer:
        "No. La base y el tipo dependen de la modalidad de juego y deben verificarse en la normativa vigente.",
    },
  ],
});
