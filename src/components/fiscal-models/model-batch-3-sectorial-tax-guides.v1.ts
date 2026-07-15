import { createBatch3PracticalGuideV1 } from "./create-batch-3-practical-guide.v1";

export const MODEL_410_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "410",
  category: "Entidades de crédito · Depósitos",
  statusLabel: "Pago a cuenta anual",
  statusTone: "current",
  intro: [
    "El Modelo 410 es el pago a cuenta del Impuesto sobre los Depósitos en las Entidades de Crédito.",
    "Lo presentan las entidades de crédito obligadas; no es una retención ni una declaración del titular de una cuenta bancaria.",
  ],
  notices: [
    {
      title: "Pago anticipado de la entidad, no del depositante",
      paragraphs: [
        "El pago a cuenta se descuenta posteriormente en la autoliquidación del Modelo 411. Su cálculo y plazo deben revisarse para el ejercicio vigente.",
      ],
    },
  ],
  type: "Pago a cuenta del impuesto sobre depósitos.",
  presenter: "Entidad de crédito o sucursal española obligada por el impuesto.",
  nonPresenter:
    "Titular de una cuenta, depositante, ahorrador o empresa cliente de la entidad.",
  periodicity: "Anual como pago a cuenta, según la campaña aplicable.",
  deadline:
    "En el periodo oficial del pago a cuenta del ejercicio; debe verificarse en las instrucciones vigentes.",
  channel: "Presentación electrónica con ingreso cuando resulte cuota.",
  result:
    "Pago anticipado que se deduce en la autoliquidación anual del Modelo 411.",
  included: [
    "Entidad, sucursales y fondos de terceros.",
    "Magnitudes legales para determinar el pago a cuenta.",
    "Distribución territorial cuando corresponda.",
    "Ejercicio, pago e identificación del obligado.",
  ],
  excluded: [
    "Retención sobre intereses del depositante.",
    "Declaración informativa de cuentas del Modelo 196.",
    "Liquidación anual definitiva del Modelo 411.",
    "Traslado automático del impuesto al cliente.",
  ],
  preparation: [
    "Confirmar condición de sujeto pasivo.",
    "Conciliar saldos y magnitudes del cálculo.",
    "Separar datos territoriales.",
    "Conservar justificante para deducirlo en el 411.",
  ],
  correction:
    "Rectifica el pago a cuenta por el cauce oficial y ajusta después la conciliación con el 411; no dupliques el importe deducible.",
  procedureSourceId: "aeat.model-410.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-410.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-410.instructions.2026-06-09",
  legalSourceIds: [
    "boe.model-410.order-hap-2178-2014.original",
    "boe.model-411.order-hap-1230-2015.original",
  ],
  related: [
    {
      code: "411",
      href: "/consultor-fiscal/modelos/411",
      description: "Autoliquidación anual del impuesto sobre depósitos.",
    },
    {
      code: "196",
      href: "/consultor-fiscal/modelos/196",
      description:
        "Información de cuentas financieras, con finalidad distinta.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el titular de una cuenta?",
      answer: "No. El obligado es la entidad de crédito, no el depositante.",
    },
    {
      question: "¿Se descuenta después?",
      answer:
        "Sí. El pago a cuenta correctamente realizado se concilia y deduce en el Modelo 411.",
    },
  ],
});

export const MODEL_411_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "411",
  category: "Entidades de crédito · Depósitos",
  statusLabel: "Autoliquidación anual",
  statusTone: "current",
  intro: [
    "El Modelo 411 es la autoliquidación anual del Impuesto sobre los Depósitos en las Entidades de Crédito.",
    "Lo presenta la entidad de crédito, calcula la cuota anual y descuenta el pago a cuenta efectuado mediante el Modelo 410.",
  ],
  notices: [
    {
      title: "No es un impuesto declarado por el ahorrador",
      paragraphs: [
        "La base, el tipo y la distribución territorial corresponden a la entidad obligada. El titular de una cuenta no presenta el 411.",
      ],
    },
  ],
  type: "Autoliquidación anual del impuesto sobre depósitos.",
  presenter: "Entidad de crédito o sucursal española sujeta al impuesto.",
  nonPresenter:
    "Titular de una cuenta, ahorrador, empresa depositante o cliente de la entidad.",
  periodicity: "Anual.",
  deadline:
    "En el plazo anual fijado por la normativa y la campaña; debe comprobarse para cada ejercicio.",
  channel:
    "Presentación electrónica con pago del resultado cuando corresponda.",
  result:
    "Cuota anual menos el pago a cuenta del Modelo 410, con el resultado que proceda.",
  included: [
    "Saldo medio y fondos de terceros conforme a la base legal.",
    "Partidas excluidas y tipo vigente.",
    "Pago a cuenta del 410.",
    "Distribución territorial por oficinas o sucursales.",
  ],
  excluded: [
    "Declaración personal del depositante.",
    "Retenciones sobre intereses.",
    "Pago a cuenta previo del Modelo 410.",
    "Información de cuentas del Modelo 196.",
  ],
  preparation: [
    "Conciliar saldos medios y exclusiones.",
    "Aplicar el tipo vigente del ejercicio.",
    "Verificar el 410 deducible.",
    "Preparar el reparto territorial.",
  ],
  correction:
    "Corrige la autoliquidación por el cauce oficial, manteniendo trazabilidad de base, tipo, distribución territorial y pago a cuenta.",
  procedureSourceId: "aeat.model-411.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-411.procedure-home.2026-06-09",
  helpSourceId: "aeat.model-411.instructions.2026-06-09",
  document: {
    label: "Instrucciones oficiales del Modelo 411",
    sourceId: "aeat.model-411.instructions-pdf.2026-07-13",
  },
  legalSourceIds: [
    "boe.model-411.order-hap-1230-2015.original",
    "boe.model-410.order-hap-2178-2014.original",
  ],
  related: [
    {
      code: "410",
      href: "/consultor-fiscal/modelos/410",
      description: "Pago a cuenta que se descuenta en la liquidación anual.",
    },
    {
      code: "196",
      href: "/consultor-fiscal/modelos/196",
      description:
        "Información financiera de cuentas, sin liquidar este impuesto.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede salir a devolver?",
      answer:
        "El resultado depende de la cuota anual y del pago a cuenta; debe seguirse el procedimiento oficial del ejercicio.",
    },
    {
      question: "¿Cómo se descuenta el Modelo 410?",
      answer:
        "Se concilia el pago efectivamente realizado y se aplica en la autoliquidación sin duplicarlo.",
    },
  ],
});

export const MODEL_430_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "430",
  category: "Seguros · Primas",
  statusLabel: "Autoliquidación mensual",
  statusTone: "current",
  intro: [
    "El Modelo 430 liquida mensualmente el Impuesto sobre las Primas de Seguros.",
    "Lo presentan aseguradoras y otros obligados; el asegurado no presenta este modelo por contratar una póliza.",
  ],
  notices: [
    {
      title: "No todas las pólizas están sujetas",
      paragraphs: [
        "Deben separarse operaciones sujetas, exentas, anulaciones y extornos. El tipo y la campaña se muestran siempre ligados al ejercicio vigente.",
      ],
    },
  ],
  type: "Autoliquidación mensual del impuesto sobre primas.",
  presenter:
    "Entidad aseguradora, representante fiscal u otro obligado por operaciones sujetas en España.",
  nonPresenter: "Asegurado, tomador o mediador por el solo hecho de la póliza.",
  periodicity: "Mensual.",
  deadline:
    "Durante los veinte primeros días del mes siguiente, salvo reglas especiales vigentes.",
  channel: "Presentación electrónica con ingreso.",
  result:
    "Cuota del impuesto a ingresar, conciliable con el resumen anual 480.",
  included: [
    "Primas de operaciones sujetas con riesgo localizado en España.",
    "Base, recargos incluidos o excluidos y tipo vigente.",
    "Extornos, anulaciones y ajustes del periodo.",
    "Aseguradora, representante y periodo mensual.",
  ],
  excluded: [
    "Seguros exentos conforme a la norma.",
    "Declaración del asegurado.",
    "Resumen anual del Modelo 480.",
    "Retenciones sobre seguros de los Modelos 128 y 188.",
  ],
  preparation: [
    "Clasificar pólizas sujetas y exentas.",
    "Conciliar primas, extornos y anulaciones.",
    "Aplicar el tipo vigente del periodo.",
    "Cuadrar los doce periodos con el 480.",
  ],
  correction:
    "Rectifica el periodo mensual afectado y refleja después el dato correcto en el resumen 480; no ajustes solo el resumen anual.",
  procedureSourceId: "aeat.model-430.procedure-home.2026-03-01",
  recordSourceId: "aeat.model-430.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-430.instructions.2026-06-09",
  legalSourceIds: [
    "boe.model-430.order-hfp-1284-2023.original",
    "boe.models-430-480.order-eha-3212-2004.original",
  ],
  related: [
    {
      code: "480",
      href: "/consultor-fiscal/modelos/480",
      description: "Resumen anual del impuesto sobre primas.",
    },
    {
      code: "128",
      href: "/consultor-fiscal/modelos/128",
      description: "Retenciones periódicas sobre seguros y capitalización.",
    },
    {
      code: "188",
      href: "/consultor-fiscal/modelos/188",
      description: "Resumen anual de esas retenciones.",
    },
  ],
  specificFaq: [
    {
      question: "¿Todos los seguros pagan este impuesto?",
      answer:
        "No. Existen operaciones exentas; hay que clasificar cada póliza conforme a la norma vigente.",
    },
    {
      question: "¿Cómo se declaran devoluciones de primas?",
      answer:
        "Mediante los extornos y ajustes previstos para el periodo, conservando la documentación que vincula la devolución con la póliza original.",
    },
  ],
});

export const MODEL_480_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "480",
  category: "Seguros · Primas",
  statusLabel: "Resumen anual",
  statusTone: "current",
  intro: [
    "El Modelo 480 resume anualmente las bases y cuotas del Impuesto sobre las Primas de Seguros declaradas en los Modelos 430 mensuales.",
    "No vuelve a liquidar el impuesto ni lo presenta el asegurado: sirve para conciliar la información anual de la aseguradora.",
  ],
  notices: [
    {
      title: "Debe cuadrar con los periodos mensuales",
      paragraphs: [
        "Si existe un error en un mes, debe corregirse el 430 correspondiente y después reflejar el total anual correcto en el 480.",
      ],
    },
  ],
  type: "Declaración resumen anual del impuesto sobre primas.",
  presenter:
    "Entidad aseguradora, representante fiscal u otro obligado que presentó los Modelos 430.",
  nonPresenter:
    "Asegurado, tomador o mediador por contratar o intermediar pólizas.",
  periodicity: "Anual.",
  deadline: "Durante enero del año siguiente, conforme a la campaña vigente.",
  channel: "Presentación electrónica mediante formulario o fichero admitido.",
  result: "Resumen informativo anual; no genera por sí mismo un nuevo pago.",
  included: [
    "Bases y cuotas de los doce periodos del 430.",
    "Extornos, modificaciones y totales anuales.",
    "Operaciones exentas cuando el diseño las requiera.",
    "Identificación del obligado y ejercicio.",
  ],
  excluded: [
    "Nuevo ingreso del impuesto.",
    "Declaración del asegurado.",
    "Corrección sustitutiva de un 430 mensual erróneo.",
    "Resumen de retenciones sobre seguros del Modelo 188.",
  ],
  preparation: [
    "Conciliar todos los 430 presentados.",
    "Revisar complementarias y rectificaciones.",
    "Separar bases, cuotas, exentas y extornos.",
    "Validar el fichero antes de enviarlo.",
  ],
  correction:
    "Corrige primero los periodos mensuales afectados y presenta después la corrección del 480 que corresponda.",
  procedureSourceId: "aeat.model-480.procedure-home.2026-03-01",
  recordSourceId: "aeat.model-480.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-480.instructions.2026-06-09",
  legalSourceIds: [
    "boe.model-480.order-hfp-1246-2022.original",
    "boe.models-430-480.order-eha-3212-2004.original",
  ],
  related: [
    {
      code: "430",
      href: "/consultor-fiscal/modelos/430",
      description: "Autoliquidación mensual que alimenta el resumen anual.",
    },
  ],
  specificFaq: [
    {
      question: "¿Genera un nuevo pago?",
      answer: "No. Es un resumen anual de lo declarado en los periodos 430.",
    },
    {
      question: "¿Qué ocurre si un mes estaba mal?",
      answer:
        "Debe corregirse el 430 del mes y luego reconciliar y corregir el resumen anual.",
    },
  ],
});

export const MODEL_490_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "490",
  category: "Servicios digitales · Grandes empresas",
  statusLabel: "Trimestral · Tipo legal del 3 %",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 490 autoliquida el Impuesto sobre Determinados Servicios Digitales para empresas o grupos que superan los umbrales legales y prestan servicios digitales sujetos en España.",
    "No afecta a cualquier negocio con una web o una tienda en línea y debe distinguirse del IVA, Sociedades y las obligaciones informativas de plataformas.",
  ],
  notices: [
    {
      title: "Tipo del 3 % y umbrales ligados a la norma vigente",
      paragraphs: [
        "El 3 % se aplica a la base de servicios sujetos, no a todas las ventas digitales. Umbrales, localización y exclusiones deben comprobarse para el periodo declarado.",
      ],
    },
  ],
  type: "Autoliquidación trimestral del impuesto sobre servicios digitales.",
  presenter:
    "Empresa o grupo que supera los umbrales legales y obtiene ingresos por servicios digitales sujetos localizados en España.",
  nonPresenter:
    "Un autónomo o tienda online por el solo hecho de vender por internet, sin superar umbrales ni prestar servicios sujetos.",
  periodicity: "Trimestral.",
  deadline:
    "En el mes siguiente a cada trimestre, conforme al calendario oficial vigente.",
  channel: "Presentación electrónica con ingreso.",
  result:
    "Cuota a ingresar calculada al tipo legal del 3 % sobre la base sujeta.",
  included: [
    "Publicidad en línea en los supuestos sujetos.",
    "Intermediación en línea sujeta.",
    "Transmisión de datos generados por usuarios cuando encaje en la ley.",
    "Localización de usuarios, base y registros de operaciones.",
  ],
  excluded: [
    "Venta directa de bienes propios por internet.",
    "Servicios financieros regulados excluidos.",
    "Servicios digitales intragrupo excluidos.",
    "IVA, Impuesto sobre Sociedades o DAC7.",
  ],
  preparation: [
    "Comprobar umbral mundial y umbral de ingresos sujetos en España.",
    "Clasificar los servicios digitales.",
    "Aplicar reglas de localización sin conservar datos innecesarios.",
    "Conciliar base, tipo del 3 % y registros.",
  ],
  correction:
    "Rectifica el trimestre por el cauce oficial y conserva la trazabilidad de umbrales, clasificación, localización y base.",
  procedureSourceId: "aeat.model-490.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-490.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-490.instructions-pdf.captured-2026-07-13",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes oficiales del impuesto",
      sourceId: "aeat.model-490.faq-pdf.2024-01-23",
    },
  ],
  legalSourceIds: [
    "boe.model-490.law-4-2020.original",
    "boe.model-490.royal-decree-400-2021.original",
    "boe.model-490.order-hac-590-2021.original",
  ],
  related: [
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Autoliquidación anual del Impuesto sobre Sociedades.",
    },
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description: "Autoliquidación periódica del IVA.",
    },
    {
      code: "231",
      href: "/consultor-fiscal/modelos/231",
      description: "Información país por país de grandes grupos.",
    },
    {
      code: "238",
      href: "/consultor-fiscal/modelos/238",
      description: "Información de operadores de plataformas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Afecta a cualquier tienda online?",
      answer:
        "No. Deben superarse los umbrales legales y prestarse alguno de los servicios digitales sujetos.",
    },
    {
      question: "¿Es IVA?",
      answer:
        "No. Es un impuesto distinto con base, tipo del 3 %, umbrales y reglas de localización propios.",
    },
  ],
});
