import { createBatch3PracticalGuideV1 } from "./create-batch-3-practical-guide.v1";

export const MODEL_353_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "353",
  category: "IVA · Grupo de entidades",
  statusLabel: "Mensual · Modelo agregado",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 353 reúne los resultados individuales de IVA de las entidades que forman parte de un grupo acogido al régimen especial del grupo de entidades.",
    "Lo presenta la entidad dominante o representante después de coordinar los Modelos 322 de las entidades del grupo; no es la consolidación fiscal del Impuesto sobre Sociedades.",
  ],
  notices: [
    {
      title: "El agregado no sustituye a los Modelos 322",
      paragraphs: [
        "La AEAT indica que el 353 se presenta después de las autoliquidaciones individuales. Si falta algún 322 puede remitirse el agregado, pero ello no elimina la obligación ni la responsabilidad por el 322 omitido.",
      ],
    },
  ],
  type: "Autoliquidación mensual agregada de IVA.",
  presenter: "Entidad dominante o representante del grupo de entidades de IVA.",
  nonPresenter:
    "Cada entidad dependiente por separado, un grupo mercantil sin régimen especial de IVA o un grupo fiscal de Sociedades.",
  periodicity: "Mensual para todos los periodos del grupo.",
  deadline:
    "Del día 1 al 30 del mes siguiente; la declaración de enero puede presentarse hasta el último día de febrero.",
  channel:
    "Presentación electrónica, con formulario o fichero en los canales descritos por la AEAT.",
  result:
    "Agrega resultados positivos y negativos del grupo y puede resultar a ingresar, compensar o devolver conforme al régimen aplicable.",
  included: [
    "Número de grupo, entidad dominante, ejercicio y periodo mensual.",
    "Resultados de los Modelos 322 de dominante y dependientes.",
    "Compensaciones anteriores y solicitud de devolución cuando proceda.",
    "Modalidad básica o avanzada y coordinación con libros/SII.",
  ],
  excluded: [
    "Autoliquidación individual del Modelo 322.",
    "Autoliquidación ordinaria del Modelo 303 fuera del grupo.",
    "Comunicación censal del grupo mediante el Modelo 039.",
    "Consolidación fiscal del Impuesto sobre Sociedades.",
  ],
  preparation: [
    "Confirmar número, composición y modalidad del grupo.",
    "Conciliar todos los 322 y documentar cualquier declaración pendiente.",
    "Revisar compensaciones, devolución y cuenta bancaria.",
    "Cruzar el agregado con libros y SII de cada entidad.",
  ],
  correction:
    "Corrige el 322 afectado y revisa simultáneamente el 353 del mismo periodo; no alteres el agregado sin reconciliar la declaración individual.",
  procedureSourceId: "aeat.model-353.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-353.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-353.instructions.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "Ayuda técnica del Modelo 353",
      sourceId: "aeat.model-353.browser-file-help.2026-02-01",
    },
  ],
  legalSourceIds: ["boe.models-322-353-039.order-eha-3434-2007.original"],
  related: [
    {
      code: "322",
      href: "/consultor-fiscal/modelos/322",
      description:
        "Autoliquidación mensual individual de cada entidad del grupo.",
    },
    {
      code: "039",
      href: "/consultor-fiscal/modelos/039",
      description: "Comunicación censal del régimen de grupo de entidades.",
    },
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description: "Autoliquidación ordinaria del IVA fuera del grupo.",
    },
    {
      code: "390",
      href: "/consultor-fiscal/modelos/390",
      description: "Resumen anual del IVA cuando corresponda.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué ocurre si falta un Modelo 322?",
      answer:
        "La AEAT permite enviar el 353, pero el 322 pendiente sigue siendo obligatorio y su omisión conserva las consecuencias que correspondan.",
    },
    {
      question: "¿Se presenta también el Modelo 303?",
      answer:
        "No por las mismas operaciones y periodo de una entidad integrada en el régimen; cada entidad utiliza el 322 y la dominante agrega en el 353.",
    },
  ],
});

export const MODEL_364_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "364",
  category: "IVA · OTAN y cuarteles generales",
  statusLabel: "Solicitud institucional de reembolso",
  statusTone: "current",
  intro: [
    "El Modelo 364 es la solicitud de reembolso de cuotas de IVA soportadas relativas a la OTAN, sus cuarteles generales internacionales y los Estados parte en el Tratado.",
    "El beneficiario es la institución o colectivo acreditado; una empresa proveedora no adquiere por prestar el servicio el derecho a presentar esta solicitud.",
  ],
  notices: [
    {
      title: "Reembolso institucional, no devolución ordinaria",
      paragraphs: [
        "La operación, el beneficiario y el destino oficial deben encajar en el Real Decreto 160/2008 y en el procedimiento aprobado por la Orden HAP/841/2016.",
      ],
    },
  ],
  type: "Solicitud institucional de reembolso de IVA.",
  presenter:
    "OTAN, cuartel general internacional, Estado parte o representante autorizado que figure como beneficiario del régimen.",
  nonPresenter:
    "El proveedor, un autónomo por facturar a una organización internacional o una empresa sin condición institucional beneficiaria.",
  periodicity:
    "Por periodos de solicitud y operaciones que cumplan los requisitos del procedimiento.",
  deadline:
    "Dentro del plazo que corresponda al periodo y al supuesto institucional; debe comprobarse en la ficha oficial antes de enviar.",
  channel:
    "Solicitud electrónica con identificación institucional, facturas, certificación, destino oficial y cuenta bancaria.",
  result:
    "Puede dar lugar a resolución de reembolso total, parcial, requerimiento o denegación; la solicitud no garantiza la devolución.",
  included: [
    "Cuotas soportadas por el beneficiario institucional acreditado.",
    "Adquisiciones o importaciones vinculadas a funciones oficiales.",
    "Facturas válidas, certificaciones y representación.",
    "Cuenta bancaria y relación detallada de documentos.",
  ],
  excluded: [
    "Devolución ordinaria de IVA de una empresa.",
    "Solicitud del proveedor que repercutió el impuesto.",
    "Reconocimiento previo de exención del Modelo 365.",
    "Reembolso a fuerzas armadas de otro Estado miembro del Modelo 381.",
  ],
  preparation: [
    "Acreditar identidad y representación del beneficiario.",
    "Reunir facturas y justificantes de importación.",
    "Certificar el destino y la función oficial.",
    "Conciliar importes y cuenta de abono.",
  ],
  correction:
    "Subsanar mediante el expediente o contestar el requerimiento con la documentación institucional; no sustituir una factura o certificación sin dejar trazabilidad.",
  procedureSourceId: "aeat.model-364.procedure-home.2026-03-25",
  recordSourceId: "aeat.model-364.procedure-record.2026-03-02",
  legalSourceIds: [
    "boe.models-364-365.order-hap-841-2016.original",
    "boe.nato-tax-exemptions.royal-decree-160-2008.original",
    "boe.iva.law-37-1992.original",
  ],
  related: [
    {
      code: "365",
      href: "/consultor-fiscal/modelos/365",
      description: "Reconocimiento previo de las exenciones OTAN.",
    },
    {
      code: "381",
      href: "/consultor-fiscal/modelos/381",
      description: "Reembolso a fuerzas armadas de otro Estado miembro.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede presentarlo el proveedor?",
      answer:
        "No por ser proveedor. Lo presenta el beneficiario institucional o su representante autorizado conforme al procedimiento.",
    },
    {
      question: "¿Qué diferencia existe con el Modelo 365?",
      answer:
        "El 365 solicita reconocimiento previo de la exención; el 364 pide el reembolso posterior de cuotas soportadas en los supuestos admitidos.",
    },
  ],
});

export const MODEL_365_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "365",
  category: "IVA · OTAN y cuarteles generales",
  statusLabel: "Reconocimiento previo de exención",
  statusTone: "current",
  intro: [
    "El Modelo 365 solicita el reconocimiento previo de exenciones de IVA relativas a la OTAN, sus cuarteles generales internacionales y los Estados parte en el Tratado.",
    "No es una devolución ni una decisión del proveedor: la exención exige el procedimiento y la acreditación oficial aplicables.",
  ],
  notices: [
    {
      title: "La exención no se presume",
      paragraphs: [
        "No basta con que el destinatario sea una organización internacional. Debe existir reconocimiento y documentación oficial antes de aplicar la facturación exenta cuando así lo exige el supuesto.",
      ],
    },
  ],
  type: "Solicitud de reconocimiento previo de exención de IVA.",
  presenter:
    "Organismo, cuartel general, Estado parte o representante autorizado que deba obtener el reconocimiento previo.",
  nonPresenter:
    "El proveedor por iniciativa propia o una empresa sin la condición institucional y el destino oficial exigidos.",
  periodicity:
    "Por operación o conjunto de operaciones sometido a reconocimiento.",
  deadline:
    "Antes de aplicar la exención cuando el procedimiento exige reconocimiento previo.",
  channel:
    "Solicitud electrónica con certificación institucional, descripción de bienes o servicios, proveedor y destino oficial.",
  result:
    "Resolución o documento de reconocimiento que permite aplicar la exención en sus términos; no garantiza la aceptación.",
  included: [
    "Identidad del beneficiario y representación.",
    "Bienes y servicios concretos y su destino oficial.",
    "Proveedor, presupuesto o documentación de la operación.",
    "Certificación institucional requerida.",
  ],
  excluded: [
    "Aplicación unilateral de la exención por el proveedor.",
    "Reembolso de cuotas ya soportadas del Modelo 364.",
    "Operaciones ajenas a las funciones oficiales.",
    "Procedimiento de fuerzas armadas de otro Estado miembro del 381.",
  ],
  preparation: [
    "Identificar beneficiario y representante.",
    "Describir operación, proveedor e importe previsto.",
    "Aportar certificación y destino oficial.",
    "Conservar el documento de reconocimiento para la factura.",
  ],
  correction:
    "Comunica cambios relevantes antes de utilizar el reconocimiento y subsana el expediente por el cauce oficial; el proveedor debe conservar el documento válido.",
  procedureSourceId: "aeat.model-365.procedure-home.2026-03-25",
  recordSourceId: "aeat.model-365.procedure-record.2026-03-25",
  legalSourceIds: [
    "boe.models-364-365.order-hap-841-2016.original",
    "boe.nato-tax-exemptions.royal-decree-160-2008.original",
    "boe.iva.law-37-1992.original",
  ],
  related: [
    {
      code: "364",
      href: "/consultor-fiscal/modelos/364",
      description: "Reembolso de cuotas soportadas en el ámbito OTAN.",
    },
    {
      code: "381",
      href: "/consultor-fiscal/modelos/381",
      description: "Reembolso para fuerzas armadas de otro Estado miembro.",
    },
  ],
  specificFaq: [
    {
      question: "¿La solicita el proveedor?",
      answer:
        "No por regla general. La solicita el beneficiario institucional o su representante; el proveedor aplica el documento oficial en sus términos.",
    },
    {
      question: "¿Puede facturarse sin IVA antes del reconocimiento?",
      answer:
        "No debe presumirse. Cuando se exige reconocimiento previo, hay que obtenerlo antes de aplicar la exención.",
    },
  ],
});

export const MODEL_368_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "368",
  category: "IVA · MOSS histórico",
  statusLabel: "Histórico · sustituido por 035 y 369",
  statusTone: "historical",
  transitionYear: 2021,
  intro: [
    "El Modelo 368 fue la declaración de IVA de los antiguos regímenes especiales MOSS para servicios de telecomunicaciones, radiodifusión, televisión y servicios electrónicos.",
    "No se utiliza para operaciones correspondientes desde el 1 de julio de 2021; los regímenes actuales se gestionan con el Formulario 035 y el Modelo 369.",
  ],
  notices: [
    {
      title: "Modelo histórico desde el 1 de julio de 2021",
      paragraphs: [
        "La ficha sirve para comprender, consultar o corregir periodos antiguos. No ofrece una nueva presentación actual ni redirige automáticamente una operación histórica al régimen vigente.",
      ],
    },
  ],
  type: "Declaración trimestral histórica de IVA MOSS.",
  presenter:
    "Operador que estuvo acogido a los antiguos regímenes de la Unión o exterior de MOSS para periodos anteriores al 1 de julio de 2021.",
  nonPresenter:
    "Quien declara operaciones actuales de OSS/IOSS o una empresa sin prestaciones B2C comprendidas en el antiguo régimen.",
  periodicity: "Trimestral para los periodos históricos de MOSS.",
  deadline:
    "Solo para consultas, incidencias o correcciones de periodos antiguos; las operaciones actuales siguen los plazos del 369.",
  channel:
    "Consulta y corrección histórica en la sede; para regímenes actuales, alta mediante 035 y declaración mediante 369.",
  result:
    "Regularización o consulta de IVA histórico por Estados miembros de consumo; no genera una declaración actual.",
  included: [
    "Servicios B2C de telecomunicaciones, radiodifusión, televisión y electrónicos.",
    "Regímenes histórico de la Unión y exterior de la Unión.",
    "Estados de consumo, tipos e importes de periodos anteriores.",
    "Consultas y correcciones de declaraciones antiguas.",
  ],
  excluded: [
    "Operaciones desde el 1 de julio de 2021.",
    "Altas y modificaciones actuales del Formulario 035.",
    "Declaraciones actuales OSS/IOSS del Modelo 369.",
    "Presentación de una nueva declaración 368 de 2026.",
  ],
  preparation: [
    "Identificar régimen, trimestre y Estado de identificación histórico.",
    "Conservar declaración, pago y desglose por Estado de consumo.",
    "Separar periodos anteriores y posteriores al 1 de julio de 2021.",
    "Usar el trámite actual solo para operaciones actuales.",
  ],
  correction:
    "Corrige cada periodo histórico por el cauce que indique la AEAT y no lo mezcles con ajustes de declaraciones 369 posteriores.",
  procedureSourceId: "aeat.model-368.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-368.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-368.union-instructions.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "Instrucciones del régimen exterior histórico",
      sourceId: "aeat.model-368.non-union-instructions.2026-06-09",
    },
  ],
  legalSourceIds: ["boe.model-368.order-hap-460-2015.original"],
  allowProcedureAction: false,
  readOnlyActionLabel: "Consultar declaraciones históricas del Modelo 368",
  related: [
    {
      code: "035",
      href: "/consultor-fiscal/modelos/035",
      description:
        "Alta, modificación o baja en los regímenes OSS/IOSS actuales.",
    },
    {
      code: "369",
      href: "/consultor-fiscal/modelos/369",
      description: "Declaración actual de IVA de los regímenes OSS/IOSS.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puedo presentar un Modelo 368 de 2026?",
      answer:
        "No. Para operaciones actuales deben revisarse el Formulario 035 y el Modelo 369.",
    },
    {
      question: "¿Qué ocurrió el 1 de julio de 2021?",
      answer:
        "Entró en funcionamiento la ampliación de la ventanilla única y el 368 dejó paso a los actuales regímenes 035/369 para las operaciones posteriores.",
    },
  ],
});

export const MODEL_379_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "379",
  category: "IVA · CESOP",
  statusLabel: "Trimestral · Proveedores de pago",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 379 permite que determinados proveedores de servicios de pago comuniquen los pagos transfronterizos sujetos al sistema europeo CESOP.",
    "No lo presenta el comercio ni la persona que paga; el obligado es el proveedor de servicios de pago que supera las reglas de cómputo por beneficiario y trimestre.",
  ],
  notices: [
    {
      title: "Más de 25 pagos, sin importe mínimo por operación",
      paragraphs: [
        "El umbral se analiza por beneficiario y trimestre. Deben agregarse los distintos medios, identificadores y cuentas conocidos del mismo beneficiario conforme a las reglas CESOP.",
      ],
    },
  ],
  type: "Declaración informativa trimestral CESOP.",
  presenter:
    "Banco, entidad de pago u otro proveedor de servicios de pago obligado por la normativa CESOP.",
  nonPresenter:
    "El comercio que cobra, el cliente que paga o una empresa por aceptar tarjetas en su actividad.",
  periodicity: "Trimestral.",
  deadline:
    "Hasta el último día del mes siguiente al trimestre declarado, comprobando el calendario vigente.",
  channel:
    "Servicio web con mensajes XML, esquemas XSD y respuestas de aceptación o rechazo.",
  result:
    "Suministro de información a CESOP sin liquidación ni pago directo del comercio.",
  included: [
    "Pagos transfronterizos y reembolsos sujetos a CESOP.",
    "Beneficiario, pagador, IBAN/BIC u otros identificadores conocidos.",
    "Fecha, hora, importe, moneda, origen, destino y referencia.",
    "Agregación de medios y cuentas del mismo beneficiario.",
  ],
  excluded: [
    "Cobros nacionales fuera del sistema CESOP.",
    "Declaración de operaciones del comercio en el Modelo 347.",
    "Cobros con tarjeta y móvil informados por el Modelo 170.",
    "Una autoliquidación o un impuesto directo sobre cada pago.",
  ],
  preparation: [
    "Determinar localización de pagador y beneficiario.",
    "Unificar identificadores y medios conocidos por beneficiario.",
    "Aplicar el umbral de más de 25 pagos por trimestre.",
    "Validar XML y conciliar registros aceptados, rechazados y reembolsos.",
  ],
  correction:
    "Envía los mensajes de modificación o anulación previstos por CESOP y conserva la referencia del registro original; no dupliques un beneficiario por usar otra cuenta.",
  procedureSourceId: "aeat.model-379.procedure-home.2026-04-08",
  recordSourceId: "aeat.model-379.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-379.faq-index.2026-07-08",
  additionalOfficialLinks: [
    {
      label: "Manual técnico del servicio web CESOP",
      sourceId: "aeat.model-379.web-service-manual-pdf.2026-07-13",
    },
    {
      label: "Esquemas XSD y ejemplos oficiales",
      sourceId: "aeat.model-379.xsd-examples.2026-07-08",
    },
  ],
  legalSourceIds: [
    "boe.model-379.order-hfp-1415-2023.original",
    "boe.iva.law-37-1992.original",
    "boe.iva.royal-decree-1624-1992.original",
  ],
  related: [
    {
      code: "170",
      href: "/consultor-fiscal/modelos/170",
      description:
        "Cobros con tarjeta y móvil informados por entidades gestoras.",
    },
    {
      code: "174",
      href: "/consultor-fiscal/modelos/174",
      description: "Información individualizada de tarjetas.",
    },
    {
      code: "238",
      href: "/consultor-fiscal/modelos/238",
      description: "Información de operadores de plataformas.",
    },
    {
      code: "347",
      href: "/consultor-fiscal/modelos/347",
      description: "Operaciones anuales con terceras personas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Existe un importe mínimo por pago?",
      answer:
        "No. La regla oficial se centra en superar 25 pagos transfronterizos al mismo beneficiario durante el trimestre.",
    },
    {
      question: "¿Se cuenta cada cuenta del beneficiario por separado?",
      answer:
        "Deben agregarse los distintos medios e identificadores conocidos del mismo beneficiario según las reglas CESOP; no se fragmenta artificialmente el cómputo.",
    },
  ],
});

export const MODEL_380_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "380",
  category: "IVA · Operaciones asimiladas a importaciones",
  statusLabel: "Autoliquidación sectorial",
  statusTone: "current",
  intro: [
    "El Modelo 380 liquida el IVA de determinadas operaciones que la Ley considera asimiladas a una importación, especialmente al abandonar ciertos regímenes aduaneros o fiscales.",
    "No es un DUA ordinario ni sustituye la autoliquidación periódica del Modelo 303.",
  ],
  notices: [
    {
      title: "La salida del régimen determina el análisis",
      paragraphs: [
        "Hay que identificar el depósito o régimen, el documento de vinculación y de salida, el sujeto pasivo y todas las operaciones acumuladas que formen la base.",
      ],
    },
  ],
  type: "Declaración-liquidación de IVA en operaciones asimiladas a importación.",
  presenter:
    "Sujeto pasivo que realiza la operación asimilada, según la titularidad y salida del régimen o depósito aplicable.",
  nonPresenter:
    "Quien realiza una importación aduanera ordinaria o una compra exterior sin el supuesto de operación asimilada.",
  periodicity:
    "Mensual, trimestral o anual según el periodo de liquidación aplicable al obligado.",
  deadline:
    "En el plazo correspondiente al periodo de liquidación aplicable, tras verificar la campaña y el supuesto concreto.",
  channel: "Presentación electrónica en la sede de la AEAT.",
  result:
    "Cuota de IVA a ingresar o regularizar por la operación asimilada, sin sustituir las demás obligaciones periódicas.",
  included: [
    "Salida de depósito distinto del aduanero u otros regímenes suspensivos.",
    "Bienes vinculados, documento de entrada y documento de salida.",
    "Base acumulada, servicios, tipo y cuota.",
    "Sujeto pasivo, depositante y titular del depósito.",
  ],
  excluded: [
    "DUA de importación ordinaria.",
    "Autoliquidación periódica completa del Modelo 303.",
    "IVA no periódico del Modelo 309 sin operación asimilada.",
    "Pago previo sobre extracción de carburantes del Modelo 319.",
  ],
  preparation: [
    "Identificar régimen, depósito y momento de ultimación.",
    "Reunir documentos de vinculación, circulación y salida.",
    "Conciliar base, servicios acumulados y cuota.",
    "Separar IVA e Impuestos Especiales cuando concurran.",
  ],
  correction:
    "Presenta la complementaria o rectificación aplicable y conserva la cadena documental del régimen; no alteres retroactivamente la fecha de salida.",
  procedureSourceId: "aeat.model-380.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-380.procedure-record.2025-06-03",
  helpSourceId: "aeat.model-380.help.2026-06-19",
  legalSourceIds: [
    "boe.model-380.order-eha-1308-2005.original",
    "boe.model-380.order-eha-3482-2007.original",
    "boe.model-380.order-hfp-626-2023.original",
  ],
  related: [
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description: "Autoliquidación periódica ordinaria del IVA.",
    },
    {
      code: "309",
      href: "/consultor-fiscal/modelos/309",
      description: "Autoliquidación no periódica de IVA.",
    },
    {
      code: "319",
      href: "/consultor-fiscal/modelos/319",
      description:
        "Pago a cuenta previo en determinadas extracciones de carburantes.",
    },
  ],
  specificFaq: [
    {
      question: "¿Es una importación ordinaria?",
      answer:
        "No. Es una operación que la Ley asimila a una importación por la salida o ultimación de un régimen concreto.",
    },
    {
      question: "¿Sustituye al Modelo 303?",
      answer:
        "No. El 380 liquida esta operación especial y no reemplaza la autoliquidación periódica que corresponda.",
    },
  ],
});

export const MODEL_381_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "381",
  category: "IVA · Fuerzas armadas de la Unión Europea",
  statusLabel: "Solicitud institucional de reembolso",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 381 solicita el reembolso de cuotas de IVA relativas a las fuerzas armadas de un Estado miembro distinto de España cuando participan en actividades de defensa dentro de la política común de seguridad y defensa.",
    "Es un procedimiento institucional distinto de los Modelos 364 y 365 de la OTAN y no puede utilizarlo una empresa proveedora.",
  ],
  notices: [
    {
      title: "Ámbito exacto de defensa de la Unión",
      paragraphs: [
        "La Orden HFP/645/2023 limita el procedimiento al colectivo y actividad definidos. No debe confundirse defensa nacional ordinaria con una actividad de defensa de la Unión Europea.",
      ],
    },
  ],
  type: "Solicitud institucional de reembolso de IVA.",
  presenter:
    "Fuerzas armadas de otro Estado miembro, su personal civil incluido o representante institucional en los supuestos definidos.",
  nonPresenter:
    "La empresa proveedora, las fuerzas armadas españolas por este solo procedimiento o una entidad ajena a la actividad de defensa admitida.",
  periodicity:
    "Por periodos y operaciones institucionales que cumplan el régimen.",
  deadline:
    "Dentro del plazo oficial del periodo de solicitud; debe comprobarse en la sede antes de presentar.",
  channel:
    "Solicitud electrónica con certificación institucional, facturas, relación de bienes o servicios y cuenta bancaria.",
  result:
    "Resolución de reembolso total, parcial, requerimiento o denegación; la presentación no garantiza el abono.",
  included: [
    "Fuerzas armadas de otro Estado miembro y personal civil comprendido.",
    "Bienes, servicios o importaciones destinados a actividad de defensa admitida.",
    "Facturas, certificación institucional y representación.",
    "Cuotas soportadas y cuenta de devolución.",
  ],
  excluded: [
    "Devolución ordinaria de IVA de una empresa.",
    "Solicitud del proveedor.",
    "Régimen OTAN de los Modelos 364 y 365.",
    "Actividad de defensa nacional ajena al supuesto de la Unión.",
  ],
  preparation: [
    "Identificar Estado miembro, unidad y representante.",
    "Acreditar actividad de defensa y destino oficial.",
    "Reunir facturas y documentos de importación.",
    "Conciliar cuotas y cuenta bancaria.",
  ],
  correction:
    "Subsanar dentro del expediente y responder a requerimientos con la certificación oficial; no ampliar el ámbito de la solicitud sin acreditación.",
  procedureSourceId: "aeat.model-381.procedure-home.2026-03-25",
  recordSourceId: "aeat.model-381.procedure-home.2026-03-25",
  helpSourceId: "aeat.model-381.news.2025-09-29",
  legalSourceIds: ["boe.model-381.order-hfp-645-2023.original"],
  related: [
    {
      code: "364",
      href: "/consultor-fiscal/modelos/364",
      description: "Reembolso institucional en el ámbito de la OTAN.",
    },
    {
      code: "365",
      href: "/consultor-fiscal/modelos/365",
      description: "Reconocimiento previo de exenciones OTAN.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede usarlo una empresa proveedora?",
      answer:
        "No. La empresa aporta la factura, pero el solicitante es el beneficiario institucional o su representante.",
    },
    {
      question: "¿Qué diferencia existe con 364 y 365?",
      answer:
        "El 381 se refiere a fuerzas armadas de otro Estado miembro en actividades de defensa de la Unión; 364 y 365 responden al régimen OTAN.",
    },
  ],
});
