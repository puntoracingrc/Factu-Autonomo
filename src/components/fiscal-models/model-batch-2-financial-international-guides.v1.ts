import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_280_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "280",
  category: "Ahorro a largo plazo · Entidades financieras",
  statusLabel: "Plazo especial: durante febrero",
  statusTone: "current",
  effectiveYear: 2026,
  informationYear: 2025,
  filingYear: 2026,
  intro: [
    "El Modelo 280 informa anualmente de los Planes de Ahorro a Largo Plazo —SIALP y CIALP— por parte de aseguradoras y entidades financieras.",
    "No lo presenta el ahorrador y no genera pago; el plazo estable se sitúa durante febrero, no enero.",
  ],
  notices: [
    {
      title: "Campaña 2025 versionada",
      paragraphs: [
        "La información de 2025 se presentó del 1 de febrero al 2 de marzo de 2026. La fecha final debe revisarse cada año en el calendario oficial.",
      ],
    },
  ],
  type: "Declaración informativa anual.",
  presenter:
    "Entidad aseguradora o de crédito que comercializa el SIALP o CIALP.",
  nonPresenter: "El titular por aportar o disponer de su plan.",
  periodicity: "Anual.",
  deadline:
    "Durante febrero; información de 2025: del 1 de febrero al 2 de marzo de 2026, más cuatro días técnicos solo cuando concurra la imposibilidad prevista.",
  channel:
    "Presentación electrónica mediante fichero conforme al diseño vigente.",
  result: "Información anual; no liquida impuesto.",
  included: [
    "SIALP, CIALP, titular y contrato.",
    "Apertura, extinción, aportaciones, rendimientos y movilizaciones.",
    "Permanencia, disposición total e incumplimientos.",
    "Datos necesarios para el tratamiento fiscal del ahorro.",
  ],
  excluded: [
    "Declaración del ahorrador.",
    "Garantía automática de exención.",
    "Resumen de seguros del Modelo 188.",
    "Posiciones patrimoniales generales del 189.",
  ],
  preparation: [
    "Conciliar contratos, titulares y aportaciones.",
    "Validar límites y permanencia del ejercicio.",
    "Identificar movilizaciones, disposiciones y extinciones.",
    "Aplicar el diseño de registro vigente.",
  ],
  correction:
    "Corrige o da de baja los registros por el procedimiento oficial y verifica el reflejo en certificados y datos fiscales.",
  procedureSourceId: "aeat.model-280.procedure-home.2026-04-08",
  recordSourceId: "aeat.model-280.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-280.faq.2026-07-08",
  document: {
    label: "Consultar diseño de registro del Modelo 280",
    sourceId: "aeat.model-280.register-design-pdf.captured-2026-07-13",
  },
  legalSourceIds: [
    "boe.model-280.law-35-2006.original",
    "boe.model-280.royal-decree-439-2007.original",
    "boe.model-280.order-hap-2118-2015.original",
  ],
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description: "Declaración de Renta del titular.",
    },
    {
      code: "188",
      href: "/consultor-fiscal/modelos/188",
      description: "Resumen anual de capitalización y seguros.",
    },
    {
      code: "189",
      href: "/consultor-fiscal/modelos/189",
      description: "Valores, seguros y rentas a 31 de diciembre.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué es un SIALP o CIALP?",
      answer:
        "Son modalidades aseguradora y bancaria de Plan de Ahorro a Largo Plazo sometidas a requisitos específicos.",
    },
    {
      question: "¿Qué ocurre si retiro antes?",
      answer:
        "Puede perderse el tratamiento fiscal previsto y surgir retención; la entidad debe reflejar correctamente la incidencia.",
    },
  ],
});

export const MODEL_289_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "289",
  category: "CRS · Intercambio de cuentas financieras",
  statusLabel: "CRS · Servicio web",
  statusTone: "current",
  effectiveYear: 2026,
  informationYear: 2025,
  filingYear: 2026,
  intro: [
    "El Modelo 289 es la declaración anual CRS de cuentas financieras reportables presentada por instituciones financieras.",
    "No lo presenta el titular. La campaña de información 2025 terminó el 1 de junio de 2026 y las correcciones usan mensajes CRS diferenciados.",
  ],
  notices: [
    {
      title: "Residencia fiscal y TIN extranjero",
      paragraphs: [
        "No se informan como reportables personas cuya única residencia fiscal es España. El TIN debe corresponder al identificador fiscal de la jurisdicción de residencia.",
      ],
    },
  ],
  type: "Declaración informativa anual CRS.",
  presenter:
    "Institución financiera obligada conforme al estándar común de comunicación de información.",
  nonPresenter:
    "El titular de la cuenta o una persona cuya única residencia fiscal sea España por ese solo hecho.",
  periodicity: "Anual.",
  deadline:
    "Del 1 de enero hasta el final de mayo; información 2025: hasta el 1 de junio de 2026.",
  channel: "Servicio web con mensajes XML CRS y aceptación por registros.",
  result:
    "Información intercambiable; admite declaración sin cuentas reportables.",
  included: [
    "Titular, residencia fiscal, TIN y personas de control.",
    "Cuenta, saldo, intereses, dividendos e ingresos brutos.",
    "Cuentas nuevas, preexistentes, cerradas o no documentadas.",
    "Mensajes OECD1 alta, OECD2 corrección y OECD3 anulación.",
  ],
  excluded: [
    "Titulares exclusivamente residentes en España.",
    "Reporte FATCA de personas estadounidenses del 290.",
    "Información nacional de cuentas del 196.",
    "Mezclar tipos de mensaje cuando el esquema lo impide.",
  ],
  preparation: [
    "Obtener autocertificaciones y verificar residencias/TIN.",
    "Aplicar diligencia debida y clasificar cuentas.",
    "Conciliar saldos y rendimientos.",
    "Validar XML y procesar rechazos parciales.",
  ],
  correction:
    "Emplea OECD2 u OECD3 según proceda, respetando referencias y evitando mezclar altas con correcciones de forma incompatible.",
  procedureSourceId: "aeat.model-289.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-289.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-289.web-service-help.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes CRS",
      sourceId: "aeat.model-289.faq.2026-07-08",
    },
    {
      label: "Consulta de errores del servicio",
      sourceId: "aeat.model-289.error-service-help.2026-06-09",
    },
  ],
  document: {
    label: "Manual del servicio web 289",
    sourceId: "aeat.model-289.web-service-manual-pdf.v2-7.2023-07-04",
  },
  legalSourceIds: ["boe.model-289.order-hap-1695-2016.original"],
  related: [
    {
      code: "290",
      href: "/consultor-fiscal/modelos/290",
      description: "Reporte FATCA de cuentas estadounidenses.",
    },
    {
      code: "291",
      href: "/consultor-fiscal/modelos/291",
      description: "Información histórica de cuentas de no residentes.",
    },
    {
      code: "196",
      href: "/consultor-fiscal/modelos/196",
      description: "Información nacional mensual de cuentas desde 2026.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede presentarse sin cuentas?",
      answer:
        "Sí, la AEAT contempla la declaración sin cuentas reportables cuando corresponda.",
    },
    {
      question: "¿Qué diferencia hay con FATCA?",
      answer:
        "CRS es un estándar multilateral; FATCA se basa en el acuerdo con Estados Unidos y utiliza el Modelo 290.",
    },
  ],
});

export const MODEL_290_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "290",
  category: "FATCA · Cuentas estadounidenses",
  statusLabel: "FATCA · Servicio web",
  statusTone: "current",
  effectiveYear: 2026,
  informationYear: 2025,
  filingYear: 2026,
  intro: [
    "El Modelo 290 informa anualmente de cuentas financieras de determinadas personas estadounidenses conforme a FATCA y al acuerdo España–Estados Unidos.",
    "Lo presenta la institución financiera, no el titular, y requiere especial control del US TIN y de las personas de control.",
  ],
  notices: [
    {
      title: "FATCA no es CRS",
      paragraphs: [
        "Debe aplicarse la diligencia debida y la clasificación del acuerdo bilateral; la información 2025 tuvo como límite general el 1 de junio de 2026.",
      ],
    },
  ],
  type: "Declaración informativa anual FATCA.",
  presenter: "Institución financiera española obligada bajo FATCA.",
  nonPresenter:
    "La persona estadounidense titular o cualquier entidad sin la condición de institución obligada.",
  periodicity: "Anual.",
  deadline:
    "Del 1 de enero hasta el final de mayo; información 2025: hasta el 1 de junio de 2026.",
  channel: "Servicio web/XML con validación de mensajes y registros.",
  result: "Información intercambiada con Estados Unidos; no genera pago.",
  included: [
    "Persona estadounidense especificada y US TIN.",
    "Entidades pasivas y personas estadounidenses de control.",
    "Cuenta, saldo, intereses, dividendos y otros ingresos.",
    "Cuentas cerradas, diligencia debida y autocertificación.",
  ],
  excluded: [
    "Reporte CRS del 289.",
    "Cuenta no reportable conforme al acuerdo.",
    "Información nacional ordinaria del 196.",
    "Presentación por el titular.",
  ],
  preparation: [
    "Validar US TIN y estatus FATCA.",
    "Clasificar entidad y personas de control.",
    "Conciliar saldos y rendimientos.",
    "Validar XML y gestionar rechazos.",
  ],
  correction:
    "Corrige o anula mediante los mensajes y referencias del servicio web FATCA, conservando la trazabilidad de los registros.",
  procedureSourceId: "aeat.model-290.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-290.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-290.web-service-help.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "Preguntas frecuentes FATCA",
      sourceId: "aeat.model-290.faq.2026-07-08",
    },
  ],
  document: {
    label: "Manual oficial del servicio web 290",
    sourceId: "aeat.model-290.web-service-manual-pdf.v2-16.captured-2026-07-13",
  },
  legalSourceIds: [
    "boe.model-290.order-hap-1136-2014.original",
    "boe.fatca.spain-united-states-agreement.original",
  ],
  related: [
    {
      code: "289",
      href: "/consultor-fiscal/modelos/289",
      description: "Reporte multilateral CRS.",
    },
    {
      code: "196",
      href: "/consultor-fiscal/modelos/196",
      description: "Información mensual nacional de cuentas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué TIN se necesita?",
      answer:
        "El identificador fiscal estadounidense aplicable —US TIN— del titular o persona de control reportable.",
    },
    {
      question: "¿Qué diferencia hay con CRS?",
      answer:
        "FATCA se refiere al acuerdo con Estados Unidos; CRS abarca jurisdicciones participantes y usa el Modelo 289.",
    },
  ],
});

export const MODEL_291_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "291",
  category: "Cuentas de no residentes · Transición",
  statusLabel: "Transición 2026 al Modelo 196 mensual",
  statusTone: "historical",
  informationYear: 2025,
  filingYear: 2026,
  transitionYear: 2026,
  intro: [
    "El Modelo 291 recogió anualmente las cuentas de no residentes sin establecimiento permanente; la información de 2025 se presentó en enero de 2026.",
    "Desde la información de 2026 debe comprobarse su traslado al nuevo Modelo 196 mensual. Esta ficha conserva consultas y correcciones de ejercicios anteriores sin ofrecer presentación de 2026.",
  ],
  notices: [
    {
      title: "No presentar ejercicio 2026 por esta ficha",
      paragraphs: [
        "El titular no es el declarante. La entidad financiera debe aplicar el nuevo diseño mensual del 196 y usar el 291 solo para gestiones históricas que sigan disponibles.",
      ],
    },
  ],
  type: "Declaración informativa anual histórica reciente.",
  presenter:
    "Entidad financiera que debía informar cuentas de titulares no residentes sin establecimiento permanente.",
  nonPresenter: "El titular no residente de la cuenta.",
  periodicity:
    "Anual hasta la información de 2025; transición al Modelo 196 mensual desde 2026.",
  deadline:
    "Información 2025 presentada en enero de 2026. Para 2026 no se publica un plazo activo del 291.",
  channel:
    "Consulta y corrección histórica mediante fichero y gestiones oficiales; información nueva por el 196 cuando corresponda.",
  result: "Información; no genera pago.",
  included: [
    "Titular no residente, país, TIN y cuenta.",
    "Saldo, rendimientos y retenciones de ejercicios anteriores.",
    "Certificado de residencia.",
    "Consultas y correcciones históricas.",
  ],
  excluded: [
    "Presentación del titular.",
    "Información nueva de 2026 sin comprobar el 196.",
    "CRS del 289 o FATCA del 290.",
    "Resumen de rentas pagadas a no residentes del 296.",
  ],
  preparation: [
    "Identificar el ejercicio histórico.",
    "Conservar certificados de residencia.",
    "Conciliar cuentas, saldos, rendimientos y retenciones.",
    "Para 2026, mapear al diseño mensual del 196.",
  ],
  correction:
    "Las declaraciones de 2025 y anteriores se corrigen por las gestiones históricas disponibles; no se crea una declaración 291 de 2026.",
  procedureSourceId: "aeat.model-291.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-291.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-291.file-help.2026-01-09",
  document: {
    label: "Consultar diseño histórico del Modelo 291",
    sourceId: "aeat.model-291.register-design-pdf.captured-2026-07-13",
  },
  legalSourceIds: ["boe.model-291.order-eha-3202-2008.original"],
  related: [
    {
      code: "196",
      href: "/consultor-fiscal/modelos/196",
      description: "Información mensual de cuentas desde 2026.",
    },
    {
      code: "289",
      href: "/consultor-fiscal/modelos/289",
      description: "Reporte CRS.",
    },
    {
      code: "290",
      href: "/consultor-fiscal/modelos/290",
      description: "Reporte FATCA.",
    },
    {
      code: "296",
      href: "/consultor-fiscal/modelos/296",
      description: "Resumen anual de rentas pagadas a no residentes.",
    },
  ],
  allowProcedureAction: false,
  readOnlyActionLabel: "Consultar gestiones de ejercicios anteriores",
  specificFaq: [
    {
      question: "¿Sigue utilizándose para 2026?",
      answer:
        "No debe presentarse para información de 2026 sin verificar la transición; la obligación se ha integrado en el Modelo 196 mensual.",
    },
    {
      question: "¿Puedo corregir una declaración de 2025?",
      answer:
        "Sí, mediante las gestiones históricas oficiales del 291 que permanezcan disponibles.",
    },
  ],
});

export const MODEL_294_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "294",
  category: "IIC españolas · Comercialización transfronteriza",
  statusLabel: "Operaciones · Hasta 31 de marzo",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 294 informa anualmente de distribuciones, reembolsos y transmisiones de clientes extranjeros en IIC españolas comercializadas transfronterizamente.",
    "No lo presenta el inversor y se centra en operaciones del año; las posiciones a 31 de diciembre pertenecen al Modelo 295.",
  ],
  notices: [
    {
      title: "Operaciones, no posición final",
      paragraphs: [
        "Se presenta mediante fichero y exige conciliar comercializadora extranjera, cuenta global, cliente, residencia, importe y retención.",
      ],
    },
  ],
  type: "Declaración informativa anual de operaciones.",
  presenter:
    "Comercializadora extranjera u obligado previsto en la comercialización transfronteriza de IIC españolas.",
  nonPresenter:
    "El inversor o una entidad sin la condición de comercializadora obligada.",
  periodicity: "Anual.",
  deadline: "Del 1 de enero al 31 de marzo.",
  channel: "Presentación electrónica mediante fichero.",
  result: "Información; no genera pago.",
  included: [
    "IIC española, comercializadora y cuenta global.",
    "Cliente, NIF/TIN, país y residencia.",
    "Distribuciones, reembolsos y transmisiones.",
    "Fechas, importes, participaciones y retenciones.",
  ],
  excluded: [
    "Posición a 31 de diciembre del 295.",
    "Resumen ordinario de fondos del 187.",
    "Retenciones periódicas del 117.",
    "Presentación por el inversor.",
  ],
  preparation: [
    "Conciliar operaciones con la IIC y la cuenta global.",
    "Validar residencia y TIN.",
    "Revisar certificados y retenciones.",
    "Generar y validar el fichero del ejercicio.",
  ],
  correction:
    "Corrige o da de baja registros mediante las gestiones oficiales y reconcilia el resultado con el 295 y el 187.",
  procedureSourceId: "aeat.model-294.procedure-home.2026-03-11",
  recordSourceId: "aeat.model-294.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-294.file-help.2026-03-11",
  document: {
    label: "Consultar diseño de registro del Modelo 294",
    sourceId: "aeat.model-294.register-design-pdf.captured-2026-07-13",
  },
  legalSourceIds: ["boe.models-294-295.order-eha-1674-2006.original"],
  related: [
    {
      code: "295",
      href: "/consultor-fiscal/modelos/295",
      description: "Posiciones a 31 de diciembre.",
    },
    {
      code: "187",
      href: "/consultor-fiscal/modelos/187",
      description: "Resumen anual de operaciones con IIC.",
    },
    {
      code: "117",
      href: "/consultor-fiscal/modelos/117",
      description: "Retenciones periódicas sobre IIC.",
    },
    {
      code: "296",
      href: "/consultor-fiscal/modelos/296",
      description: "Resumen de rentas pagadas a no residentes.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué es una cuenta global?",
      answer:
        "Una cuenta de la comercializadora en la que se agrupan posiciones de clientes, que exige identificar individualmente a los perceptores.",
    },
    {
      question: "¿Qué diferencia tiene con el 295?",
      answer:
        "El 294 informa operaciones del año; el 295 informa la posición existente a 31 de diciembre.",
    },
  ],
});

export const MODEL_295_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "295",
  category: "IIC españolas · Posiciones transfronterizas",
  statusLabel: "Saldos a 31 de diciembre",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 295 informa de las posiciones a 31 de diciembre de clientes extranjeros en IIC españolas comercializadas transfronterizamente.",
    "No informa las operaciones del año —función del 294— ni lo presenta el inversor.",
  ],
  notices: [
    {
      title: "Fotografía a 31 de diciembre",
      paragraphs: [
        "Deben cuadrarse participaciones y valor final con las operaciones del Modelo 294 y los registros de la comercializadora.",
      ],
    },
  ],
  type: "Declaración informativa anual de posiciones.",
  presenter:
    "Comercializadora extranjera u obligado previsto respecto de posiciones de clientes en IIC españolas.",
  nonPresenter:
    "El inversor o una entidad sin la condición de comercializadora obligada.",
  periodicity: "Anual.",
  deadline: "Del 1 de enero al 31 de marzo.",
  channel: "Presentación electrónica mediante fichero.",
  result: "Información de posiciones; no genera pago.",
  included: [
    "IIC española, comercializadora y cuenta global.",
    "Cliente, TIN, país y residencia.",
    "Número de participaciones y valor a 31 de diciembre.",
    "Conciliación con operaciones del Modelo 294.",
  ],
  excluded: [
    "Operaciones anuales del 294.",
    "Valores y seguros generales del 189.",
    "Resumen ordinario de IIC del 187.",
    "Presentación por el inversor.",
  ],
  preparation: [
    "Cerrar posiciones a 31 de diciembre.",
    "Conciliar altas, bajas y operaciones del 294.",
    "Validar TIN y residencia.",
    "Aplicar el diseño de fichero vigente.",
  ],
  correction:
    "Corrige o da de baja por el procedimiento oficial y vuelve a conciliar la posición final con las operaciones del año.",
  procedureSourceId: "aeat.model-295.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-295.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-295.file-help.2026-03-11",
  document: {
    label: "Consultar diseño de registro del Modelo 295",
    sourceId: "aeat.model-295.register-design-pdf.captured-2026-07-13",
  },
  legalSourceIds: ["boe.models-294-295.order-eha-1674-2006.original"],
  related: [
    {
      code: "294",
      href: "/consultor-fiscal/modelos/294",
      description: "Operaciones anuales de los clientes.",
    },
    {
      code: "187",
      href: "/consultor-fiscal/modelos/187",
      description: "Resumen anual de operaciones con IIC.",
    },
    {
      code: "189",
      href: "/consultor-fiscal/modelos/189",
      description: "Valores, seguros y rentas a 31 de diciembre.",
    },
  ],
  specificFaq: [
    {
      question: "¿Informa operaciones o saldos?",
      answer:
        "Informa la posición existente a 31 de diciembre; las operaciones se declaran en el 294.",
    },
    {
      question: "¿Se presenta mediante formulario?",
      answer:
        "La ficha oficial establece presentación mediante fichero conforme al diseño vigente.",
    },
  ],
});
