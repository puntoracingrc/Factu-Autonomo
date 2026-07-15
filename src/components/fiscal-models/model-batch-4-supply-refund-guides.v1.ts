import { createBatch4PracticalGuideV1 } from "./create-batch-4-practical-guide.v1";

export const MODEL_546_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "546",
  category: "Impuestos Especiales · Suministros y devoluciones",
  statusLabel: "Trimestral · Hasta el día 20",
  statusTone: "current",
  intro: [
    "El Modelo 546 comunica suministros de gasóleo marcado a embarcaciones que pueden generar el derecho a devolución del Impuesto sobre Hidrocarburos.",
    "Lo presenta el suministrador obligado mediante el sistema oficial; no el armador por recibir combustible ni una embarcación privada de recreo.",
  ],
  notices: [
    {
      title: "SIANE y recibo de entrega",
      paragraphs: [
        "Cada suministro debe quedar respaldado por la identificación de la embarcación, el recibo de entrega y los mensajes del sistema. La comunicación no concede automáticamente la devolución.",
      ],
    },
  ],
  type: "Relación trimestral de suministros con derecho a devolución.",
  presenter:
    "Suministrador u operador obligado que avitualla gasóleo marcado a una embarcación elegible.",
  nonPresenter:
    "Armador, tripulante, embarcación privada de recreo o comprador ordinario por el solo hecho de recibir combustible.",
  periodicity: "Trimestral.",
  deadline:
    "Primeros 20 días naturales del mes siguiente a la finalización de cada trimestre.",
  channel:
    "Formulario web o servicio web oficial dentro de SIANE, con los mensajes y controles técnicos aplicables.",
  result:
    "Comunicación de suministros para control de una devolución; no supone reconocimiento ni pago automático.",
  included: [
    "Gasóleo marcado para navegación distinta de la privada de recreo cuando concurre el beneficio.",
    "Suministrador, embarcación, NIF, matrícula o IMO, fecha, producto y litros.",
    "Recibo de entrega y referencia electrónica SIANE.",
  ],
  excluded: [
    "Gasóleo de una embarcación privada de recreo.",
    "Solicitud general de devolución del Modelo 572.",
    "Autoliquidación de hidrocarburos del Modelo 581.",
  ],
  preparation: [
    "Confirmar elegibilidad y uso de la embarcación.",
    "Conciliar recibo, factura, fecha, producto y litros.",
    "Validar matrícula/IMO y referencias SIANE.",
    "Evitar duplicidades entre mensajes y trimestre.",
  ],
  correction:
    "Rectifica el mensaje o la relación por el cauce SIANE aplicable, manteniendo la trazabilidad del recibo original y sin duplicar el suministro.",
  procedureSourceId: "aeat.model-546.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-546.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-546.siane-information.2024-12-23",
  document: {
    label: "Mensajes oficiales de la solicitud de devolución",
    sourceId: "aeat.model-546.siane-messages-pdf.2026-07-13",
  },
  additionalOfficialLinks: [
    {
      label: "Recibo oficial de entrega",
      sourceId: "aeat.model-546.delivery-receipt-pdf.2026-07-13",
    },
  ],
  legalSourceIds: [
    "boe.model-546.order-hac-1147-2018.original",
    "boe.model-546.royal-decree-1512-2018.original",
  ],
  related: [
    {
      code: "545",
      href: "/consultor-fiscal/modelos/545",
      description: "Suministros bajo beneficios de relaciones internacionales.",
    },
    {
      code: "572",
      href: "/consultor-fiscal/modelos/572",
      description: "Solicitud trimestral de devolución de hidrocarburos.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación del Impuesto sobre Hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cualquier embarcación genera devolución?",
      answer:
        "No. Deben cumplirse el destino y los requisitos del beneficio; la navegación privada de recreo queda fuera.",
    },
    {
      question: "¿La relación concede la devolución?",
      answer:
        "No. Aporta la trazabilidad del avituallamiento para el procedimiento oficial.",
    },
  ],
});

export const MODEL_547_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "547",
  category: "Impuestos Especiales · Gasóleo bonificado",
  statusLabel: "Trimestral · Entidades emisoras",
  statusTone: "current",
  intro: [
    "El Modelo 547 relaciona los abonos que las entidades emisoras de medios de pago específicos realizan a detallistas de gasóleo bonificado.",
    "No lo presenta el comercio que compra gasóleo ni el cliente final: el declarante es la entidad que emite el cheque o la tarjeta y abona al detallista.",
  ],
  notices: [
    {
      title: "No confundir con el Modelo 544",
      paragraphs: [
        "El 544 relaciona pagos efectuados con los medios específicos; el 547 informa de los abonos de la entidad emisora al detallista.",
      ],
    },
  ],
  type: "Relación trimestral informativa de abonos.",
  presenter:
    "Entidad emisora de cheques-gasóleo o tarjetas-gasóleo bonificado que abona importes a detallistas.",
  nonPresenter:
    "Detallista, agricultor, transportista o cliente por comprar, vender o consumir gasóleo bonificado.",
  periodicity: "Trimestral.",
  deadline:
    "Primeros 20 días naturales del mes siguiente al trimestre declarado.",
  channel:
    "Formulario electrónico o importación de fichero en la sede de la AEAT.",
  result:
    "Información de control de abonos; no liquida ni devuelve por sí misma el impuesto.",
  included: [
    "Entidad emisora y detallista receptor del abono.",
    "Identificación del medio, fecha, importe, producto y periodo.",
    "Conciliación con pagos y operaciones del sistema.",
  ],
  excluded: [
    "Compra ordinaria del cliente final.",
    "Pagos relacionados mediante el Modelo 544.",
    "Autoliquidación del Modelo 581.",
  ],
  preparation: [
    "Validar emisor y detallista.",
    "Conciliar abono con el medio y la operación.",
    "Agrupar por trimestre sin duplicidades.",
    "Revisar CAE, fechas e importes.",
  ],
  correction:
    "Corrige la relación oficial conservando la identidad del abono y del medio de pago; no crees un segundo registro para subsanar el primero.",
  procedureSourceId: "aeat.model-547.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-547.procedure-record.2026-06-09",
  legalSourceIds: [
    "boe.excise.order-eha-3482-2007.original",
    "boe.excise.order-eha-3363-2010.original",
  ],
  related: [
    {
      code: "544",
      href: "/consultor-fiscal/modelos/544",
      description: "Pagos con cheque o tarjeta de gasóleo bonificado.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación de hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el detallista que recibe el abono?",
      answer:
        "No por ese solo hecho. La obligación descrita corresponde a la entidad emisora del medio de pago.",
    },
    {
      question: "¿Qué diferencia existe con el 544?",
      answer:
        "El 544 informa pagos con los medios específicos y el 547 los abonos de la emisora al detallista.",
    },
  ],
});

export const MODEL_548_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "548",
  category: "Impuestos Especiales · Cuotas repercutidas",
  statusLabel: "Mensual · Operaciones por cuenta ajena",
  statusTone: "current",
  intro: [
    "El Modelo 548 informa de cuotas de Impuestos Especiales repercutidas por depositarios autorizados en operaciones realizadas por cuenta ajena.",
    "Es una declaración informativa mensual: no crea un nuevo pago y excluye el Impuesto Especial sobre la Electricidad.",
  ],
  notices: [
    {
      title: "Electricidad excluida",
      paragraphs: [
        "No incorpores cuotas del Impuesto Especial sobre la Electricidad. Identifica siempre el impuesto de fabricación, el depositario y la persona por cuya cuenta se realizó la operación.",
      ],
    },
  ],
  type: "Declaración informativa mensual de cuotas repercutidas.",
  presenter:
    "Depositario autorizado que realiza por cuenta ajena una operación con repercusión de un Impuesto Especial de fabricación incluido.",
  nonPresenter:
    "Cliente que soporta la cuota, consumidor final o sujeto que solo opera con el Impuesto Especial sobre la Electricidad.",
  periodicity: "Mensual.",
  deadline:
    "Primeros 20 días naturales del mes siguiente al periodo informado.",
  channel:
    "Cumplimentación en línea o importación de fichero en la sede electrónica.",
  result:
    "Información de cuotas repercutidas; no vuelve a ingresar la cuota ya liquidada.",
  included: [
    "Operaciones por cuenta ajena del depositario autorizado.",
    "Impuesto, cuota repercutida, titular, establecimiento, producto y periodo.",
    "Datos necesarios para conciliar factura y autoliquidación.",
  ],
  excluded: [
    "Impuesto Especial sobre la Electricidad.",
    "Operaciones propias no comprendidas.",
    "Una segunda autoliquidación de la cuota.",
  ],
  preparation: [
    "Separar operaciones propias y por cuenta ajena.",
    "Excluir electricidad.",
    "Conciliar facturas, titulares, cuotas y autoliquidaciones.",
    "Validar CAE y periodo mensual.",
  ],
  correction:
    "Corrige la información por el canal oficial y concilia la modificación con factura y autoliquidación; no dupliques el ingreso.",
  procedureSourceId: "aeat.model-548.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-548.procedure-record.2026-06-09",
  legalSourceIds: ["boe.model-548.order-hap-779-2013.original"],
  related: [
    {
      code: "553",
      href: "/consultor-fiscal/modelos/553",
      description: "Operaciones de fábricas y depósitos de vino.",
    },
    {
      code: "560",
      href: "/consultor-fiscal/modelos/560",
      description: "Autoliquidación de electricidad, expresamente distinta.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación de hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Genera un pago adicional?",
      answer:
        "No. Es informativo y debe conciliarse con las cuotas ya repercutidas y liquidadas.",
    },
    {
      question: "¿Incluye electricidad?",
      answer:
        "No. La normativa del 548 excluye el Impuesto Especial sobre la Electricidad.",
    },
  ],
});

export const MODEL_568_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "568",
  category: "Medios de transporte · Devolución por reventa",
  statusLabel: "Trimestral · Revendedores profesionales",
  statusTone: "current",
  intro: [
    "El Modelo 568 solicita la devolución de parte del impuesto de matriculación cuando un revendedor profesional vende y envía definitivamente el medio de transporte fuera del territorio.",
    "No sirve para cualquier propietario: el envío debe producirse antes de cuatro años desde la primera matriculación definitiva y la cuantía depende del valor en ese momento.",
  ],
  notices: [
    {
      title: "Límite de cuatro años",
      paragraphs: [
        "Comprueba primera matriculación, fecha de envío definitivo y condición profesional. La devolución no equivale necesariamente a toda la cuota inicialmente pagada.",
      ],
    },
  ],
  type: "Solicitud trimestral de devolución.",
  presenter:
    "Empresario dedicado profesionalmente a la reventa de medios de transporte.",
  nonPresenter:
    "Particular que vende su vehículo o empresa que no ejerce profesionalmente la reventa.",
  periodicity: "Trimestral.",
  deadline: "Primeros 20 días naturales del mes siguiente a cada trimestre.",
  channel: "Presentación electrónica individual o por lotes.",
  result:
    "Solicitud de devolución de la parte calculada sobre el valor del medio en la fecha de envío; puede ser comprobada, reducida o denegada.",
  included: [
    "Vehículos, embarcaciones o aeronaves revendidos por profesional.",
    "Primera matriculación, envío definitivo, destino y valor actual.",
    "Permiso o licencia, contrato de venta y certificación de baja.",
  ],
  excluded: [
    "Venta de un particular.",
    "Envío no definitivo.",
    "Medio enviado después del límite de cuatro años.",
    "Autoliquidación previa a matriculación del 576.",
  ],
  preparation: [
    "Acreditar actividad profesional.",
    "Comprobar primera matriculación y fecha de envío.",
    "Reunir permiso, contrato y baja.",
    "Determinar valor y cuenta bancaria con documentación.",
  ],
  correction:
    "Subsana la solicitud o aporta documentación por el expediente oficial; no alteres fechas ni valores sin prueba objetiva.",
  procedureSourceId: "aeat.model-568.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-568.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-568.information.2026-03-03",
  document: {
    label: "Formulario oficial del Modelo 568",
    sourceId: "aeat.model-568.form-pdf.2022-06-10",
  },
  additionalOfficialLinks: [
    {
      label: "Ayuda oficial para presentación por lotes",
      sourceId: "aeat.model-568.batch-help.2026-06-09",
    },
  ],
  legalSourceIds: [
    "boe.excise-law-38-1992.consolidated.2026-06-30",
    "boe.order-eha-3496-2009.original",
  ],
  related: [
    {
      code: "05",
      href: "/consultor-fiscal/modelos/05",
      description: "Exenciones y no sujeciones de matriculación.",
    },
    {
      code: "06",
      href: "/consultor-fiscal/modelos/06",
      description: "Declaración especial de determinados medios de transporte.",
    },
    {
      code: "576",
      href: "/consultor-fiscal/modelos/576",
      description: "Autoliquidación del impuesto de matriculación.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede utilizarlo un particular?",
      answer:
        "No. Está reservado al empresario dedicado profesionalmente a la reventa.",
    },
    {
      question: "¿Devuelve toda la cuota inicial?",
      answer:
        "No necesariamente; se calcula la parte correspondiente al valor del medio en la fecha del envío.",
    },
  ],
});

export const MODEL_571_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "571",
  category: "Hidrocarburos · Reconocimiento previo",
  statusLabel: "Autorización previa · No solicita el dinero",
  statusTone: "current",
  intro: [
    "El Modelo 571 gestiona el reconocimiento previo de determinados beneficios de devolución del Impuesto sobre Hidrocarburos.",
    "No es la solicitud periódica de dinero: una vez reconocido el derecho, la devolución correspondiente se tramita mediante el Modelo 572.",
  ],
  notices: [
    {
      title: "571 primero; 572 después",
      paragraphs: [
        "No apliques el beneficio solo por haber comprado combustible. Debe existir un uso legalmente incluido y, cuando proceda, autorización, registro y memoria técnica.",
      ],
    },
  ],
  type: "Solicitud de reconocimiento o autorización previa.",
  presenter:
    "Titular de la actividad o establecimiento que destinará hidrocarburos a un uso con derecho de devolución.",
  nonPresenter:
    "Consumidor o empresa por cualquier compra ordinaria de carburante.",
  periodicity:
    "Antes de aplicar el beneficio y cuando cambien los datos autorizados.",
  deadline:
    "Con carácter previo al uso o a la aplicación del beneficio cuando así lo exige el procedimiento.",
  channel:
    "Formulario oficial y aportación de memoria, proceso, producto y establecimiento.",
  result:
    "Puede reconocer o denegar el derecho; no ordena por sí solo una devolución económica.",
  included: [
    "Actividad y uso legalmente admitidos.",
    "Producto, proceso, cantidades previstas y establecimiento.",
    "CAE, memoria técnica, almacenamiento y contabilidad cuando proceda.",
  ],
  excluded: [
    "Solicitud periódica de devolución del 572.",
    "Compra ordinaria de combustible.",
    "Uso distinto del autorizado.",
  ],
  preparation: [
    "Identificar fundamento legal del uso.",
    "Preparar memoria y proceso.",
    "Definir producto y cantidades previstas.",
    "Verificar registro, CAE y contabilidad.",
  ],
  correction:
    "Comunica cambios o baja y solicita la modificación del reconocimiento antes de aplicar el beneficio a un uso distinto.",
  procedureSourceId: "aeat.model-571.procedure-home.2026-03-25",
  recordSourceId: "aeat.model-571.procedure-record.2026-03-25",
  legalSourceIds: [
    "boe.excise-law-38-1992.consolidated.2026-06-30",
    "boe.model-571-resolution-1996.original",
  ],
  related: [
    {
      code: "572",
      href: "/consultor-fiscal/modelos/572",
      description: "Solicitud periódica de devolución ya reconocida.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación del Impuesto sobre Hidrocarburos.",
    },
    {
      code: "590",
      href: "/consultor-fiscal/modelos/590",
      description: "Devolución por exportación o expedición.",
    },
  ],
  specificFaq: [
    {
      question: "¿El 571 solicita el dinero?",
      answer:
        "No. Gestiona el reconocimiento previo; la devolución periódica se solicita mediante el 572.",
    },
    {
      question: "¿Puede aplicarse a cualquier carburante?",
      answer:
        "No. Solo a productos y usos incluidos en la normativa y en el reconocimiento concedido.",
    },
  ],
});

export const MODEL_572_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "572",
  category: "Hidrocarburos · Devolución por usos autorizados",
  statusLabel: "Trimestral · Relacionado con 571",
  statusTone: "current",
  intro: [
    "El Modelo 572 solicita trimestralmente la devolución de cuotas soportadas por hidrocarburos usados en determinados destinos autorizados.",
    "No es una devolución general de combustible y puede requerir un reconocimiento previo vigente mediante el Modelo 571.",
  ],
  notices: [
    {
      title: "Uso y consumo acreditados",
      paragraphs: [
        "Las cantidades adquiridas, consumidas y solicitadas deben poder conciliarse con facturas, existencias, proceso y autorización.",
      ],
    },
  ],
  type: "Solicitud trimestral de devolución.",
  presenter:
    "Beneficiario autorizado que utilizó el producto en un uso con derecho a devolución.",
  nonPresenter:
    "Comprador de combustible sin uso reconocido o sin la autorización previa exigible.",
  periodicity: "Trimestral.",
  deadline: "Primeros 20 días naturales del mes siguiente al trimestre.",
  channel:
    "Presentación electrónica con los datos y documentos de la devolución.",
  result:
    "Solicitud que puede concederse total o parcialmente, requerirse o denegarse; no es devolución de IVA.",
  included: [
    "Producto, epígrafe, proveedor y factura.",
    "Cantidad adquirida, utilizada y existencias.",
    "Uso, proceso, autorización, cuota soportada y cuenta bancaria.",
  ],
  excluded: [
    "Combustible de uso ordinario.",
    "Reconocimiento previo del 571.",
    "Devolución de IVA.",
    "Cantidad no consumida o no justificada.",
  ],
  preparation: [
    "Comprobar vigencia del 571 cuando sea exigible.",
    "Conciliar compras, consumo y existencias.",
    "Revisar facturas y cuotas.",
    "Separar cada uso y trimestre.",
  ],
  correction:
    "Rectifica o aporta documentación por el expediente oficial; si se pidió de más, regulariza sin ocultar la solicitud previa.",
  procedureSourceId: "aeat.model-572.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-572.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-572.information.2026-03-27",
  document: {
    label: "Formulario e instrucciones oficiales del Modelo 572",
    sourceId: "aeat.model-572.form-pdf.2022-06-10",
  },
  legalSourceIds: [
    "boe.excise-law-38-1992.consolidated.2026-06-30",
    "boe.order-eha-3482-2007.original",
  ],
  related: [
    {
      code: "571",
      href: "/consultor-fiscal/modelos/571",
      description: "Reconocimiento previo del beneficio.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación de hidrocarburos.",
    },
    {
      code: "590",
      href: "/consultor-fiscal/modelos/590",
      description: "Devolución por exportación o expedición.",
    },
  ],
  specificFaq: [
    {
      question: "¿Hace falta un 571 previo?",
      answer:
        "Cuando el beneficio exige reconocimiento, sí; debe estar vigente y cubrir el uso declarado.",
    },
    {
      question: "¿Es una devolución de IVA?",
      answer: "No. Se refiere a cuotas del Impuesto sobre Hidrocarburos.",
    },
  ],
});

export const MODEL_576_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "576",
  category: "Medios de transporte · Matriculación",
  statusLabel: "Antes de la matriculación definitiva",
  statusTone: "current",
  intro: [
    "El Modelo 576 autoliquida el impuesto de matriculación antes de la matriculación definitiva de determinados vehículos, embarcaciones y aeronaves.",
    "No todos los medios pagan: no sujeciones, exenciones, reducciones, emisiones, territorio y valoración determinan el cauce y pueden llevar a los Modelos 05 o 06.",
  ],
  notices: [
    {
      title: "Sin calculadora nacional fija",
      paragraphs: [
        "Los tipos pueden variar por comunidad autónoma y ejercicio. Para vehículos usados deben aplicarse las reglas y tablas oficiales de valoración vigentes.",
      ],
    },
  ],
  type: "Autoliquidación previa a la matriculación.",
  presenter:
    "Titular o adquirente obligado que solicita la primera matriculación definitiva del medio sujeto.",
  nonPresenter:
    "Titular de un medio no sujeto, exento o tramitado válidamente por los Modelos 05 o 06.",
  periodicity: "Por cada primera matriculación u operación sujeta.",
  deadline:
    "Después del devengo y siempre antes de solicitar la matriculación definitiva.",
  channel:
    "Presentación electrónica individual o por lotes; el justificante genera el Código Electrónico de Matriculación cuando procede.",
  result:
    "Cuota a ingresar o resultado acorde con la situación declarada, con justificante para la matriculación.",
  included: [
    "Vehículo, embarcación o aeronave sujetos.",
    "Bastidor, datos técnicos, emisiones y primera matriculación.",
    "Base, valoración, reducción y tipo estatal/autonómico vigente.",
  ],
  excluded: [
    "Exención o no sujeción tramitada por 05/06.",
    "Devolución por reventa del 568.",
    "Tipo fijo nacional sin comprobar territorio y ejercicio.",
  ],
  preparation: [
    "Confirmar sujeción y cauce 05/06/576.",
    "Reunir ficha técnica, emisiones e identidad.",
    "Valorar correctamente si es usado.",
    "Verificar comunidad autónoma, tipo y NRC.",
  ],
  correction:
    "Usa complementaria o rectificación oficial según el error y el estado de la matriculación; no vuelvas a generar otra identidad del mismo medio.",
  procedureSourceId: "aeat.model-576.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-576.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-576.instructions.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "Información oficial sobre primera matriculación",
      sourceId: "aeat.model-576.information.2026-03-03",
    },
    {
      label: "Ayuda oficial para lotes",
      sourceId: "aeat.help.batch-presentation.2026-01-09",
    },
  ],
  legalSourceIds: ["boe.order-eha-3851-2007.original"],
  related: [
    {
      code: "05",
      href: "/consultor-fiscal/modelos/05",
      description: "Exenciones y no sujeciones.",
    },
    {
      code: "06",
      href: "/consultor-fiscal/modelos/06",
      description: "Declaración especial de medios de transporte.",
    },
    {
      code: "568",
      href: "/consultor-fiscal/modelos/568",
      description: "Devolución por reventa y envío fuera.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta antes o después de matricular?",
      answer: "Antes de solicitar la matriculación definitiva.",
    },
    {
      question: "¿Existe un único tipo para toda España?",
      answer:
        "No. Debe comprobarse ejercicio, emisiones y normativa de la comunidad autónoma competente.",
    },
  ],
});

export const MODEL_590_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "590",
  category: "Impuestos Especiales · Devolución exterior",
  statusLabel: "Solicitud por exportación o expedición",
  statusTone: "current",
  intro: [
    "El Modelo 590 solicita la devolución de cuotas de Impuestos Especiales soportadas por productos exportados o expedidos en determinados supuestos.",
    "No corresponde a cualquier exportación: debe acreditarse que el producto soportó el impuesto y que salió por el cauce y territorio previstos.",
  ],
  notices: [
    {
      title: "Documento aduanero y salida efectiva",
      paragraphs: [
        "Concilia DUA o documento de salida, MRN, producto, cantidad y cuota. Para determinados productos de vapeo, A24 cubre envíos a otro Estado miembro y el 590 otros envíos o exportaciones previstos.",
      ],
    },
  ],
  type: "Solicitud de devolución por exportación o expedición.",
  presenter:
    "Exportador, expedidor o titular legitimado que acredita impuesto soportado y salida comprendida.",
  nonPresenter:
    "Empresa por cualquier exportación sin Impuesto Especial soportado o sin el supuesto de devolución legal.",
  periodicity: "Por operación o solicitud vinculada al documento de salida.",
  deadline:
    "En el procedimiento general, inmediatamente después de la admisión del documento aduanero; confirma la regla del supuesto concreto.",
  channel:
    "Solicitud electrónica oficial con documento aduanero y justificantes.",
  result:
    "Puede generar devolución total o parcial, requerimiento o denegación; nunca es automática.",
  included: [
    "Producto y epígrafe sujetos.",
    "Cuota soportada y titular legitimado.",
    "DUA/MRN, destino, cantidad y prueba de salida.",
  ],
  excluded: [
    "Exportación sin cuota soportada.",
    "Devolución general de IVA.",
    "Envío de vapeo a otro Estado miembro cuando corresponde A24.",
  ],
  preparation: [
    "Identificar impuesto y cuota soportada.",
    "Conciliar factura, producto y cantidad.",
    "Validar DUA/MRN y salida efectiva.",
    "Separar el cauce A24 cuando corresponda.",
  ],
  correction:
    "Subsana la solicitud vinculada al documento aduanero original y conserva la trazabilidad de cualquier concesión previa.",
  procedureSourceId: "aeat.model-590.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-590.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-590.download.2026-06-09",
  document: {
    label: "Formulario PDF oficial del Modelo 590",
    sourceId: "aeat.model-590.form-pdf",
  },
  legalSourceIds: ["boe.order-eha-3482-2007.original"],
  related: [
    {
      code: "506",
      href: "/consultor-fiscal/modelos/506",
      description: "Devolución por introducción en depósito fiscal.",
    },
    {
      code: "572",
      href: "/consultor-fiscal/modelos/572",
      description: "Devolución de hidrocarburos por usos autorizados.",
    },
    {
      code: "573",
      href: "/consultor-fiscal/modelos/573",
      description: "Autoliquidación de líquidos de vapeo y nicotina.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sirve para cualquier exportación?",
      answer:
        "No. Debe existir cuota de un Impuesto Especial soportada y un supuesto legal de devolución.",
    },
    {
      question: "¿Qué ocurre con envíos de productos de vapeo a la UE?",
      answer:
        "Los envíos comprendidos a otro Estado miembro utilizan el A24; el 590 cubre las exportaciones y envíos territoriales previstos.",
    },
  ],
});
