import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_221_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "221",
  category: "Sociedades · Activos fiscales diferidos",
  statusLabel: "Muy especializado · 1,5 % anual",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 221 autoliquida la prestación patrimonial que deben satisfacer determinadas entidades por activos por impuesto diferido con derecho a convertirse en créditos exigibles frente a la Administración tributaria.",
    "No es un impuesto por tener pérdidas ni afecta a cualquier activo contable: se limita al régimen legal de determinados activos generados entre 2008 y 2015.",
  ],
  notices: [
    {
      title: "No corresponde a una pyme por tener pérdidas",
      paragraphs: [
        "Deben verificarse el activo acogido al régimen de conversión, las cuotas líquidas positivas y el exceso sujeto. El tipo vigente de la prestación es el 1,5 %.",
      ],
    },
  ],
  type: "Autoliquidación de una prestación patrimonial vinculada a Sociedades.",
  presenter:
    "Entidad, o entidad representante del grupo fiscal cuando corresponda, con activos por impuesto diferido incluidos en el régimen de conversión en crédito exigible.",
  nonPresenter:
    "Una empresa por contabilizar cualquier activo fiscal diferido, tener bases imponibles negativas o registrar pérdidas.",
  periodicity:
    "Anual, por el periodo impositivo de la entidad o del grupo fiscal.",
  deadline:
    "Veinticinco días naturales posteriores a los seis meses siguientes al cierre del periodo impositivo.",
  channel:
    "Presentación electrónica y pago por los medios admitidos en la sede AEAT; la domiciliación tiene su propio límite.",
  result:
    "A ingresar, aplicando el 1,5 % al exceso sujeto conforme al régimen legal.",
  included: [
    "Activos por impuesto diferido generados entre 2008 y 2015 incluidos en el régimen.",
    "Cuotas líquidas positivas de Sociedades relevantes para calcular el exceso.",
    "Entidad individual o grupo fiscal y porcentajes estatal/foral.",
    "Devengo, periodo, base, tipo del 1,5 % y cuota.",
  ],
  excluded: [
    "Cualquier pérdida contable o base imponible negativa.",
    "Cualquier activo por impuesto diferido contabilizado.",
    "La declaración anual de Sociedades de los Modelos 200 o 220.",
    "Un crédito frente a Hacienda no amparado por el régimen específico.",
  ],
  preparation: [
    "Identificar por origen y ejercicio los activos de 2008–2015 afectados.",
    "Conciliar contabilidad, declaraciones de Sociedades y cuotas líquidas positivas.",
    "Documentar el cálculo del exceso y la tributación estatal/foral.",
    "Preparar el medio de pago y conservar la liquidación.",
  ],
  correction:
    "Presenta complementaria si faltó cuota; si hubo ingreso excesivo, solicita rectificación o devolución por el cauce oficial con el detalle contable y fiscal.",
  procedureSourceId: "aeat.model-221.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-221.procedure-record.2026-06-10",
  helpSourceId: "aeat.model-221.help.2026-07-01",
  additionalOfficialLinks: [
    {
      label: "Consultar instrucciones oficiales",
      sourceId: "aeat.model-221.instructions.2026-06-10",
    },
  ],
  legalSourceIds: [
    "boe.corporate-tax.law-27-2014",
    "boe.model-221.order-hfp-550-2017",
  ],
  related: [
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description:
        "Declaración anual individual del Impuesto sobre Sociedades.",
    },
    {
      code: "220",
      href: "/consultor-fiscal/modelos/220",
      description: "Declaración anual de los grupos en consolidación fiscal.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cualquier activo diferido entra en el modelo?",
      answer:
        "No. Solo los activos expresamente incluidos en el régimen legal de conversión; deben trazarse por origen y ejercicio.",
    },
    {
      question: "¿Puede presentarlo un grupo fiscal?",
      answer:
        "Sí, cuando corresponda a la entidad representante del grupo, coordinando el cálculo con el Modelo 220.",
    },
  ],
});

export const MODEL_222_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "222",
  category: "Sociedades · Consolidación fiscal",
  statusLabel: "Pagos en abril, octubre y diciembre",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 222 sirve para que un grupo acogido formalmente al régimen de consolidación fiscal realice sus pagos fraccionados del Impuesto sobre Sociedades.",
    "Lo presenta la entidad representante del grupo en los periodos 1/P, 2/P y 3/P; no lo presenta cualquier grupo mercantil ni sustituye el Modelo 202 de entidades ajenas al grupo.",
  ],
  notices: [
    {
      title:
        "Grupo mercantil, grupo de IVA y grupo fiscal son conceptos distintos",
      paragraphs: [
        "La modalidad del artículo 40.3 es obligatoria cuando la cifra de negocios del grupo en los doce meses anteriores supera 6.000.000 de euros.",
      ],
    },
  ],
  type: "Pago fraccionado del Impuesto sobre Sociedades.",
  presenter:
    "Entidad representante de un grupo fiscal acogido válidamente al régimen de consolidación.",
  nonPresenter:
    "Un grupo mercantil sin opción por consolidación, un grupo de IVA o una entidad que tributa individualmente mediante el Modelo 202.",
  periodicity: "Tres periodos al año: 1/P, 2/P y 3/P.",
  deadline:
    "Del 1 al 20 de abril, octubre y diciembre, sin convertir el límite de domiciliación en plazo general.",
  channel:
    "Exclusivamente electrónico, incluso cuando el resultado no implique ingreso y exista obligación de declarar.",
  result:
    "Pago a cuenta del Modelo 220 o declaración sin ingreso cuando proceda.",
  included: [
    "Modalidad 40.2 sobre la última cuota declarada y porcentaje del 18 %.",
    "Modalidad 40.3 sobre base acumulada de los primeros 3, 9 u 11 meses.",
    "Resultados de las entidades, eliminaciones, incorporaciones y pagos anteriores.",
    "Tributación estatal/foral, pago mínimo y datos del grupo.",
  ],
  excluded: [
    "El pago individual de una entidad fuera del grupo, Modelo 202.",
    "La declaración anual consolidada, Modelo 220.",
    "El grupo de entidades de IVA de los Modelos 039, 322 y 353.",
    "La simple existencia de sociedades vinculadas.",
  ],
  preparation: [
    "Confirmar opción, composición y representante del grupo.",
    "Determinar la modalidad 40.2 o 40.3 aplicable.",
    "Conciliar bases acumuladas, eliminaciones, incorporaciones y pagos previos.",
    "Revisar reparto estatal/foral y medio de pago.",
  ],
  correction:
    "Presenta complementaria si faltó ingreso o solicita rectificación cuando proceda, manteniendo la conciliación con el 220 y los datos individuales.",
  procedureSourceId: "aeat.model-222.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-222.procedure-record.2026-06-10",
  helpSourceId: "aeat.model-222.presentation-help.2026-06-30",
  additionalOfficialLinks: [
    {
      label: "Consultar instrucciones 2025 y siguientes",
      sourceId: "aeat.model-222.instructions-2025-and-following.2026-06-10",
    },
  ],
  legalSourceIds: [
    "boe.corporate-tax.law-27-2014",
    "boe.models-202-222.order-hfp-227-2017",
  ],
  related: [
    {
      code: "220",
      href: "/consultor-fiscal/modelos/220",
      description:
        "Declaración anual consolidada en la que se descuentan los pagos.",
    },
    {
      code: "202",
      href: "/consultor-fiscal/modelos/202",
      description: "Pago fraccionado individual fuera del grupo fiscal.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Declaración anual individual de Sociedades.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuándo es obligatoria la modalidad 40.3?",
      answer:
        "Entre otros supuestos, cuando la cifra de negocios del grupo en los doce meses anteriores supera 6 millones de euros.",
    },
    {
      question: "¿Se presenta sin ingreso?",
      answer:
        "Puede existir obligación de presentar aunque no resulte ingreso; debe comprobarse el periodo y situación del grupo.",
    },
  ],
});

export const MODEL_237_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "237",
  category: "SOCIMI · Gravamen especial",
  statusLabel: "15 % · Dos meses desde el acuerdo",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 237 autoliquida el gravamen especial del 15 % sobre determinados beneficios obtenidos por una SOCIMI que no se distribuyen a sus socios.",
    "El devengo se produce el día del acuerdo de aplicación del resultado y el plazo termina dos meses después; no es una retención al socio ni el gravamen del Modelo 217.",
  ],
  notices: [
    {
      title: "Regla exacta: 15 % y dos meses",
      paragraphs: [
        "La base se limita a la parte no distribuida procedente de las rentas previstas legalmente. Conserva las cuentas y el acuerdo societario.",
      ],
    },
  ],
  type: "Autoliquidación del gravamen especial sobre beneficios no distribuidos.",
  presenter:
    "SOCIMI a la que resulte aplicable el gravamen por beneficios no distribuidos sujetos.",
  nonPresenter:
    "Una empresa inmobiliaria ordinaria, el socio o una SOCIMI sin beneficio incluido en el supuesto legal.",
  periodicity:
    "No periódica: vinculada a cada acuerdo de aplicación del resultado afectado.",
  deadline:
    "Dos meses desde el día del acuerdo de aplicación del resultado por la junta u órgano equivalente.",
  channel:
    "Presentación electrónica y pago, con desglose estatal/foral cuando corresponda.",
  result:
    "Ingreso del 15 % sobre el beneficio no distribuido sujeto; no puede deducirse de la denominación que todo beneficio quede gravado.",
  included: [
    "Fecha del acuerdo y periodo impositivo.",
    "Beneficio no distribuido procedente de rentas sujetas al gravamen.",
    "Tipo del 15 %, cuota y porcentajes estatal/foral.",
    "Complementaria y referencia de la autoliquidación anterior.",
  ],
  excluded: [
    "Cualquier beneficio retenido por una sociedad inmobiliaria.",
    "Dividendos distribuidos sujetos al gravamen del Modelo 217.",
    "Retenciones ordinarias de los Modelos 123 y 193.",
    "Rentas excluidas o acogidas al tratamiento legal correspondiente.",
  ],
  preparation: [
    "Conservar cuentas anuales y acuerdo de aplicación del resultado.",
    "Trazar el origen fiscal de las rentas no distribuidas.",
    "Separar las rentas no gravadas al tipo general y el tratamiento de reinversión.",
    "Calcular base, tipo, cuota y reparto territorial.",
  ],
  correction:
    "Presenta complementaria si faltó cuota; si se ingresó de más, solicita rectificación con el acuerdo, las cuentas y el origen de las rentas.",
  procedureSourceId: "aeat.model-237.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-237.procedure-record.2026-06-10",
  helpSourceId: "aeat.model-237.instructions.2026-06-10",
  legalSourceIds: [
    "boe.model-237.order-hfp-1430-2021",
    "boe.model-237.processing-order-hap-2762-2015",
  ],
  related: [
    {
      code: "217",
      href: "/consultor-fiscal/modelos/217",
      description:
        "Gravamen especial del 19 % sobre determinados dividendos distribuidos por SOCIMI.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Declaración anual de Sociedades.",
    },
    {
      code: "123",
      href: "/consultor-fiscal/modelos/123",
      description: "Retenciones ordinarias sobre dividendos y otras rentas.",
    },
    {
      code: "193",
      href: "/consultor-fiscal/modelos/193",
      description: "Resumen anual de determinadas retenciones del capital.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué diferencia hay con el Modelo 217?",
      answer:
        "El 237 grava al 15 % determinados beneficios no distribuidos; el 217 grava al 19 % determinados dividendos distribuidos.",
    },
    {
      question: "¿Es una retención al socio?",
      answer:
        "No. Es un gravamen especial de la SOCIMI y se vincula al acuerdo de aplicación del resultado.",
    },
  ],
});
