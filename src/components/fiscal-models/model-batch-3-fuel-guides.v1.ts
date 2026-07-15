import { createBatch3PracticalGuideV1 } from "./create-batch-3-practical-guide.v1";

export const MODEL_544_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "544",
  category: "Hidrocarburos · Gasóleo bonificado",
  statusLabel: "Relación trimestral · Hasta el día 20",
  statusTone: "current",
  intro: [
    "El Modelo 544 informa de pagos efectuados mediante cheques-gasóleo bonificado y tarjetas-gasóleo bonificado.",
    "Lo presentan los operadores o entidades obligados por el sistema, no el usuario final por repostar gasóleo bonificado.",
  ],
  notices: [
    {
      title: "Medios de pago específicos",
      paragraphs: [
        "La relación identifica pagos realizados con cheques o tarjetas que cumplen los requisitos del sistema. No es una autoliquidación ni la devolución del gasóleo profesional.",
      ],
    },
  ],
  type: "Relación trimestral informativa de pagos.",
  presenter:
    "Entidad emisora, operador o sujeto obligado por los medios de pago específicos de gasóleo bonificado.",
  nonPresenter:
    "Usuario final, agricultor, transportista o empresa por el solo hecho de adquirir el producto.",
  periodicity: "Trimestral.",
  deadline:
    "Hasta el día 20 del mes siguiente a la finalización del trimestre.",
  channel: "Presentación electrónica de la relación de operaciones.",
  result:
    "Información de control; no genera directamente ingreso ni devolución.",
  included: [
    "Cheque-gasóleo y tarjeta-gasóleo bonificado.",
    "Entidad emisora, detallista y adquirente.",
    "CAE, fecha, producto, cantidad e importe.",
    "Identificador del medio de pago, abono y trimestre.",
  ],
  excluded: [
    "Pago ordinario no realizado con medio específico.",
    "Solicitud del usuario final.",
    "Relación de abonos a detallistas del Modelo 547.",
    "Devolución del gasóleo profesional.",
  ],
  preparation: [
    "Validar emisor, detallista y adquirente.",
    "Conciliar cada medio de pago con la operación.",
    "Agrupar por trimestre sin duplicidades.",
    "Revisar producto, cantidad, importe y CAE.",
  ],
  correction:
    "Corrige la relación por el cauce oficial conservando el identificador del medio y de la operación; no dupliques el pago al subsanar.",
  procedureSourceId: "aeat.model-544.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-544.procedure-record.2026-06-09",
  legalSourceIds: [
    "boe.excise.resolution-2004-09-16.original",
    "boe.excise.order-eha-3482-2007.original",
  ],
  related: [
    {
      code: "547",
      href: "/consultor-fiscal/modelos/547",
      description: "Relación de abonos realizados a detallistas.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación del Impuesto sobre Hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta quien compra el gasóleo?",
      answer:
        "No. Lo presenta la entidad u operador obligado por los medios de pago específicos.",
    },
    {
      question: "¿Qué diferencia existe con el Modelo 547?",
      answer:
        "El 544 relaciona pagos con cheque o tarjeta; el 547 informa de abonos realizados a detallistas por entidades emisoras.",
    },
  ],
});

export const MODEL_545_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "545",
  category: "Hidrocarburos · Relaciones internacionales",
  statusLabel: "Relación trimestral · Hasta el día 20",
  statusTone: "current",
  intro: [
    "El Modelo 545 informa de suministros de carburantes realizados en el marco de relaciones diplomáticas, consulares e internacionales con devolución del Impuesto sobre Hidrocarburos.",
    "Lo presenta el suministrador u operador obligado, no el beneficiario por recibir el carburante ni cualquier estación de servicio.",
  ],
  notices: [
    {
      title: "Beneficiario previamente reconocido",
      paragraphs: [
        "Cada suministro debe vincularse a una acreditación o autorización válida. La relación no concede por sí sola el beneficio ni genera automáticamente la devolución.",
      ],
    },
  ],
  type: "Relación trimestral informativa de suministros.",
  presenter:
    "Suministrador u operador obligado que realiza carburantes a beneficiarios reconocidos en relaciones internacionales.",
  nonPresenter:
    "Beneficiario, estación de servicio ordinaria o suministrador sin operaciones cubiertas por el régimen.",
  periodicity: "Trimestral.",
  deadline:
    "Hasta el día 20 del mes siguiente a la finalización del trimestre.",
  channel: "Presentación electrónica de la relación de suministros.",
  result:
    "Información para controlar el beneficio y la devolución; no equivale a resolución favorable.",
  included: [
    "Beneficiarios diplomáticos, consulares u organismos admitidos.",
    "Acreditación, tarjeta o autorización.",
    "Suministrador, establecimiento y CAE.",
    "Producto, litros, fecha, factura e identificación del vehículo cuando proceda.",
  ],
  excluded: [
    "Suministro ordinario sin beneficiario reconocido.",
    "Declaración del beneficiario.",
    "Pagos con tarjeta de gasóleo bonificado del 544.",
    "Devolución ordinaria de hidrocarburos.",
  ],
  preparation: [
    "Validar acreditación y vigencia del beneficiario.",
    "Conciliar factura, fecha, producto y litros.",
    "Identificar establecimiento y CAE.",
    "Revisar duplicidades y devoluciones vinculadas.",
  ],
  correction:
    "Corrige la relación del trimestre y conserva la autorización y factura originales; no reasignes un suministro a otro beneficiario sin evidencia.",
  procedureSourceId: "aeat.model-545.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-545.procedure-record.2026-06-09",
  legalSourceIds: [
    "boe.excise.resolution-2004-09-16.original",
    "boe.excise.order-eha-3482-2007.original",
  ],
  related: [
    {
      code: "544",
      href: "/consultor-fiscal/modelos/544",
      description: "Pagos con cheques y tarjetas de gasóleo bonificado.",
    },
    {
      code: "547",
      href: "/consultor-fiscal/modelos/547",
      description: "Abonos realizados a detallistas de gasóleo bonificado.",
    },
    {
      code: "572",
      href: "/consultor-fiscal/modelos/572",
      description: "Devolución del Impuesto sobre Hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta el beneficiario?",
      answer:
        "No. La relación corresponde al suministrador u operador obligado definido por el procedimiento.",
    },
    {
      question: "¿Genera directamente la devolución?",
      answer:
        "No. Aporta información de control; el beneficio depende del reconocimiento y del procedimiento aplicable.",
    },
  ],
});
