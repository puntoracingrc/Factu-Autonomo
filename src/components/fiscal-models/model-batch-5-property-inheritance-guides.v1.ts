import { createBatch5PracticalGuideV1 } from "./create-batch-5-practical-guide.v1";

const CATEGORY = "Tributos patrimoniales, tasas y obligaciones sectoriales";
const GC12_HOME = "aeat.models-600-610-615-620-630.procedure-home.2026-06-09";
const GC12_RECORD =
  "aeat.models-600-610-615-620-630.procedure-record.2026-06-09";
const GC12_TOPIC = "aeat.itpajd-ceuta-melilla.topic.2026-07-13";

export const MODEL_600_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "600",
  category: CATEGORY,
  statusLabel: "Competencia territorial limitada",
  statusTone: "territorial",
  territorialGate: true,
  pdfAdobeWarning: true,
  intro: [
    "El Modelo 600 autoliquida determinadas transmisiones patrimoniales, operaciones societarias y actos jurídicos documentados cuando la gestión corresponde a la Administración tributaria estatal.",
    "No es un formulario estatal universal: primero hay que identificar la comunidad autónoma, territorio foral o supuesto estatal competente y después aplicar su normativa.",
  ],
  notices: [
    {
      title: "No existe un tipo nacional único",
      paragraphs: [
        "La modalidad, el sujeto pasivo, el valor de referencia, las reducciones y el tipo dependen de la operación y del territorio. Una operación sujeta a IVA puede quedar fuera de transmisiones patrimoniales y aun así generar AJD.",
      ],
    },
  ],
  type: "Autoliquidación de ITP y AJD",
  presenter:
    "La persona que resulte sujeto pasivo según la operación: adquirente, arrendatario, sociedad, socio, concesionario o interesado en el documento, siempre ante la Administración competente.",
  nonPresenter:
    "Quien compra un vehículo usado sujeto al Modelo 620, quien no es sujeto pasivo y quien debe tramitar la operación ante una comunidad autónoma o hacienda foral.",
  periodicity: "No periódica: nace con el acto, contrato o documento sujeto.",
  deadline:
    "En competencia estatal, el plazo general es de 30 días hábiles desde el acto o contrato, salvo regla específica.",
  channel:
    "Formulario y documentación ante la Administración competente; la sede estatal se reserva a Ceuta, Melilla y demás supuestos estatales.",
  result:
    "Puede resultar a ingresar, exento, no sujeto o cuota cero; la calificación debe justificarse.",
  included: [
    "Transmisiones patrimoniales onerosas, como ciertos inmuebles usados, arrendamientos, derechos reales o concesiones.",
    "Operaciones societarias y actos jurídicos documentados en los supuestos previstos.",
    "Documentos notariales, mercantiles o administrativos sujetos, con su sujeto pasivo y base propios.",
  ],
  excluded: [
    "Vehículos, embarcaciones o aeronaves usados cuando corresponde el Modelo 620.",
    "Ventas empresariales sujetas a IVA, sin perjuicio de revisar AJD.",
    "Una tarifa o bonificación común para todas las comunidades autónomas.",
  ],
  preparation: [
    "Escritura, contrato o documento privado y fecha de devengo.",
    "Identificación de las partes, bien, referencia catastral y valor de referencia cuando proceda.",
    "Justificación de exención, no sujeción, valoración, base y beneficio fiscal territorial.",
  ],
  commonMistakes: [
    "Presentarlo en la AEAT por el mero lugar de firma.",
    "Confundir IVA con ITP o ignorar la posible cuota de AJD.",
    "Aplicar una tabla autonómica a otra Administración.",
  ],
  correction:
    "Utiliza complementaria si procede ingresar más; para reducir la cuota o recuperar un ingreso indebido, solicita rectificación o devolución por el cauce de la Administración competente.",
  procedureSourceId: GC12_HOME,
  recordSourceId: GC12_RECORD,
  helpSourceId: GC12_TOPIC,
  document: {
    label: "Formulario oficial PDF del Modelo 600",
    sourceId: "aeat.model-600.form-pdf",
  },
  additionalOfficialLinks: [
    {
      label: "Descarga oficial de los modelos ITPAJD",
      sourceId: "aeat.models-600-610-615-620-630.download.2026-06-09",
    },
    {
      label: "Cuadro oficial de competencias",
      sourceId: "aeat.itpajd.competence-table.2026-01-22",
    },
  ],
  legalSourceIds: [
    "boe.order-4-july-2001-itpajd.original",
    "boe.order-hac-1927-2002.original",
  ],
  related: [
    {
      code: "620",
      href: "/consultor-fiscal/modelos/620",
      description:
        "Autoliquidación específica para determinados medios de transporte usados.",
    },
    {
      code: "630",
      href: "/consultor-fiscal/modelos/630",
      description:
        "Pago complementario de determinados documentos mercantiles.",
    },
    {
      code: "650",
      href: "/consultor-fiscal/modelos/650",
      description: "Herencias y adquisiciones mortis causa.",
    },
    {
      code: "651",
      href: "/consultor-fiscal/modelos/651",
      description: "Donaciones y adquisiciones gratuitas inter vivos.",
    },
    {
      code: "303",
      href: "/consultor-fiscal/modelos/303",
      description:
        "Autoliquidación periódica de IVA; no determina por sí sola la tributación patrimonial.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta siempre ante la AEAT?",
      answer:
        "No. La mayoría de los hechos imponibles se gestionan por comunidades autónomas; la AEAT cubre Ceuta, Melilla y otros supuestos estatales.",
    },
    {
      question: "¿Quién paga el impuesto?",
      answer:
        "Depende de la operación. Hay que identificar la modalidad y el sujeto pasivo antes de cumplimentar.",
    },
    {
      question: "¿Qué es el valor de referencia?",
      answer:
        "Es un valor fiscal que puede intervenir en determinados inmuebles; debe comprobarse para la fecha y operación concretas y no sustituye por sí solo toda la base.",
    },
    {
      question: "¿Se usa para comprar un coche usado?",
      answer:
        "Normalmente se revisa el Modelo 620, además de la Administración territorial competente.",
    },
  ],
  extraSections: [
    {
      id: "model-600-modalities",
      title: "Las tres modalidades de ITP y AJD",
      cards: [
        {
          title: "Transmisiones patrimoniales onerosas",
          paragraphs: [
            "Incluye determinados desplazamientos patrimoniales no empresariales, derechos, arrendamientos y concesiones.",
          ],
        },
        {
          title: "Operaciones societarias",
          paragraphs: [
            "Puede alcanzar constitución, aportaciones, aumentos, reducciones o disolución, con exenciones que deben verificarse.",
          ],
        },
        {
          title: "Actos jurídicos documentados",
          paragraphs: [
            "Abarca documentos notariales, mercantiles o administrativos en los supuestos legalmente sujetos.",
          ],
        },
      ],
    },
  ],
});

export const MODEL_610_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "610",
  category: CATEGORY,
  statusLabel: "Sectorial · entidades colaboradoras",
  statusTone: "territorial",
  territorialGate: true,
  intro: [
    "El Modelo 610 permite a determinadas entidades colaboradoras ingresar en metálico el AJD que grava ciertos documentos mercantiles negociados o cobrados por ellas.",
    "Es una forma sustitutiva del timbre y no una declaración del emisor del recibo ni del cliente bancario.",
  ],
  notices: [
    {
      title: "Uso restringido a documentos y entidades autorizados",
      paragraphs: [
        "No cubre cualquier factura, recibo o transferencia. La entidad debe comprobar documento, función de giro, autorización, escala y periodo conforme a la orden vigente.",
      ],
    },
  ],
  type: "Ingreso sectorial de AJD",
  presenter:
    "Entidades colaboradoras autorizadas que negocian o cobran los documentos mercantiles sujetos incluidos en el sistema de pago en metálico.",
  nonPresenter:
    "El emisor por el mero hecho de emitir un recibo, el cliente de la entidad y cualquier empresa sin autorización como entidad colaboradora.",
  periodicity:
    "Periódica según la orden vigente y el ámbito estatal aplicable; no se extrapola la periodicidad del resumen anual 611.",
  deadline:
    "Debe verificarse en la orden y calendario vigentes para el periodo y territorio.",
  channel:
    "Presentación e ingreso por el canal oficial de la Administración competente, conciliados con los documentos del periodo.",
  result:
    "Cuota a ingresar por sustitución del timbre en los documentos incluidos.",
  included: [
    "Documentos mercantiles con función de giro negociados o cobrados por la entidad.",
    "Número de documentos, importe nominal, escala y cuota del periodo.",
  ],
  excluded: [
    "Cualquier recibo o transferencia bancaria.",
    "Documentos emitidos bajo el régimen específico del Modelo 615.",
    "El resumen informativo anual del Modelo 611.",
  ],
  preparation: [
    "Autorización de entidad colaboradora y ámbito territorial.",
    "Inventario de documentos, nominales, vencimientos, escala y cuotas.",
    "Conciliación con pagos periódicos y posterior Modelo 611.",
  ],
  commonMistakes: [
    "Atribuirlo al emisor del documento.",
    "Tratar el 611 como un segundo ingreso.",
    "Mezclar documentos del 615.",
  ],
  correction:
    "Regulariza el periodo por complementaria o rectificación según el signo del error y reconcilia después el resumen anual 611.",
  procedureSourceId: GC12_HOME,
  recordSourceId: GC12_RECORD,
  helpSourceId: GC12_TOPIC,
  document: {
    label: "Formulario oficial PDF del Modelo 610",
    sourceId: "aeat.model-610.form-pdf",
  },
  legalSourceIds: [
    "boe.order-12-november-2001-itpajd.original",
    "boe.order-hac-1927-2002.original",
  ],
  related: [
    {
      code: "611",
      href: "/consultor-fiscal/modelos/611",
      description:
        "Resumen anual informativo de los documentos declarados mediante el 610.",
    },
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description:
        "Autoliquidación general de ITP y AJD en competencia estatal.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué significa pago en metálico?",
      answer:
        "Es una forma autorizada de satisfacer la cuota del documento en lugar de usar efectos timbrados; no describe el medio ordinario de cobro del cliente.",
    },
    {
      question: "¿Qué resumen anual corresponde?",
      answer:
        "El Modelo 611, que informa y concilia, pero no vuelve a ingresar las cuotas.",
    },
  ],
});

export const MODEL_611_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "611",
  category: CATEGORY,
  statusLabel: "Declaración informativa anual",
  statusTone: "current",
  intro: [
    "El Modelo 611 resume anualmente los documentos, importes y cuotas gestionados por entidades colaboradoras mediante el Modelo 610.",
    "Es informativo: no genera un segundo pago y debe cuadrar con los periodos del ejercicio.",
  ],
  notices: [
    {
      title: "No vuelvas a ingresar las cuotas",
      paragraphs: [
        "La campaña de la información de 2025 fue del 1 de enero al 20 de febrero de 2026. El PDF antiguo es solo para periodos anteriores a 2015; la campaña actual es electrónica.",
      ],
    },
  ],
  type: "Declaración informativa anual",
  presenter:
    "La entidad colaboradora que presentó Modelos 610 durante el ejercicio.",
  nonPresenter:
    "El emisor, el tenedor o el cliente; tampoco una entidad sin operaciones 610 por este solo motivo.",
  periodicity: "Anual.",
  deadline:
    "Durante el periodo anual fijado por la AEAT, normalmente hasta el 20 de febrero; información 2025: 1 de enero a 20 de febrero de 2026. Los cuatro días adicionales solo operan en la imposibilidad técnica oficial.",
  channel:
    "Presentación electrónica con el diseño vigente; el PDF descargable anterior a 2015 no sirve para campañas actuales.",
  result: "Información anual sin nuevo ingreso.",
  included: [
    "Número, importe nominal y cuotas de documentos del ejercicio.",
    "Desglose y conciliación con Modelos 610, incluidas correcciones.",
  ],
  excluded: [
    "Un segundo pago del impuesto.",
    "Uso del PDF histórico para 2025 o 2026.",
    "Documentos propios del Modelo 615/616.",
  ],
  preparation: [
    "Todos los justificantes 610 del ejercicio.",
    "Complementarias y rectificaciones que cambien totales.",
    "Archivo conforme al diseño de registro vigente.",
  ],
  commonMistakes: [
    "Duplicar el pago anual.",
    "Enviar el formulario histórico.",
    "No conciliar una complementaria 610.",
  ],
  correction:
    "Corrige primero el 610 afectado cuando proceda y presenta la declaración anual complementaria o sustitutiva conforme a la ayuda oficial.",
  procedureSourceId: "aeat.model-611.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-611.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-611.tgvi-help.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Formulario histórico anterior a 2015",
      sourceId: "aeat.model-611.legacy-form-before-2015.2026-07-14",
    },
  ],
  legalSourceIds: ["boe.order-eha-3062-2010.consolidated.2026-07-14"],
  related: [
    {
      code: "610",
      href: "/consultor-fiscal/modelos/610",
      description: "Ingreso periódico que origina la información anual.",
    },
  ],
  specificFaq: [
    {
      question: "¿Genera un nuevo pago?",
      answer:
        "No. Resume los documentos y cuotas ya gestionados mediante el 610.",
    },
    {
      question: "¿Existe plazo técnico adicional?",
      answer:
        "Solo los cuatro días naturales previstos oficialmente cuando concurre imposibilidad técnica, no como ampliación general.",
    },
  ],
});

export const MODEL_615_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "615",
  category: CATEGORY,
  statusLabel: "Sectorial · documentos con función de giro",
  statusTone: "territorial",
  territorialGate: true,
  intro: [
    "El Modelo 615 ingresa en metálico el AJD de determinados documentos emitidos con función de giro o endosables a la orden.",
    "No convierte cualquier factura, pagaré o recibo en documento sujeto y exige revisar autorización, naturaleza mercantil y competencia.",
  ],
  notices: [
    {
      title: "No se aplica a cualquier pagaré",
      paragraphs: [
        "La sujeción depende de la función de giro o de la transmisibilidad a la orden y del régimen autorizado. Su resumen anual es el 616; no debe mezclarse con el 610.",
      ],
    },
  ],
  type: "Ingreso sectorial de AJD",
  presenter:
    "La persona o entidad autorizada u obligada por la emisión de documentos sujetos bajo el sistema de pago en metálico.",
  nonPresenter:
    "Quien emite una factura, pagaré o recibo que no reúne los requisitos legales, ni una entidad que deba utilizar el régimen del 610.",
  periodicity: "Periódica conforme a la autorización y orden vigente.",
  deadline:
    "Debe obtenerse de la orden y calendario vigentes, sin copiar el plazo anual del 616.",
  channel:
    "Canal oficial de la Administración competente, con pago y relación de documentos.",
  result: "Cuota a ingresar por los documentos sujetos del periodo.",
  included: [
    "Documentos con función de giro.",
    "Documentos endosables a la orden incluidos legalmente.",
    "Nominal, vencimiento, escala y cuota.",
  ],
  excluded: [
    "Facturas o recibos sin función de giro.",
    "Documentos negociados por entidades colaboradoras del 610.",
    "Resumen anual informativo 616.",
  ],
  preparation: [
    "Autorización para sustituir timbre por pago en metálico.",
    "Emisor, beneficiario, nominal, vencimiento y tipo de documento.",
    "Conciliación con el futuro Modelo 616.",
  ],
  commonMistakes: [
    "Asumir que todo pagaré está sujeto.",
    "Confundir el régimen 610 con el 615.",
    "Repetir el pago en el 616.",
  ],
  correction:
    "Presenta complementaria o solicita rectificación según el efecto y actualiza la conciliación del 616.",
  procedureSourceId: GC12_HOME,
  recordSourceId: GC12_RECORD,
  helpSourceId: GC12_TOPIC,
  document: {
    label: "Formulario oficial PDF del Modelo 615",
    sourceId: "aeat.model-615.form-pdf",
  },
  legalSourceIds: [
    "boe.order-12-november-2001-itpajd.original",
    "boe.order-hac-1927-2002.original",
  ],
  related: [
    {
      code: "616",
      href: "/consultor-fiscal/modelos/616",
      description: "Resumen informativo anual de los documentos 615.",
    },
    {
      code: "630",
      href: "/consultor-fiscal/modelos/630",
      description:
        "Pago complementario de determinadas letras y documentos mercantiles.",
    },
  ],
  specificFaq: [
    {
      question: "¿Hace falta autorización?",
      answer:
        "Debe comprobarse que la persona o entidad puede utilizar el pago en metálico en sustitución del timbre.",
    },
    {
      question: "¿Qué significa función de giro?",
      answer:
        "Es la aptitud del documento para instrumentar el pago o circulación de un crédito en los términos tributarios; no se presume por el nombre comercial.",
    },
  ],
});

export const MODEL_616_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "616",
  category: CATEGORY,
  statusLabel: "Declaración informativa anual",
  statusTone: "current",
  intro: [
    "El Modelo 616 identifica y resume anualmente los documentos y cuotas gestionados mediante el Modelo 615.",
    "No vuelve a ingresar las cuotas y debe conciliarse con todos los periodos y correcciones del ejercicio.",
  ],
  notices: [
    {
      title: "Resumen anual sin nuevo pago",
      paragraphs: [
        "La fecha concreta se versiona por campaña. Como regla actual, el plazo llega normalmente hasta el 20 de febrero; el PDF antiguo no se usa para campañas actuales.",
      ],
    },
  ],
  type: "Declaración informativa anual",
  presenter:
    "La persona o entidad que gestionó durante el ejercicio documentos sujetos mediante Modelos 615.",
  nonPresenter:
    "El beneficiario o tenedor por esa sola condición, ni quien no utilizó el régimen del 615.",
  periodicity: "Anual.",
  deadline:
    "Periodo anual fijado por la AEAT, normalmente hasta el 20 de febrero. La ampliación técnica solo opera en el supuesto oficial.",
  channel:
    "Presentación electrónica con el diseño vigente; el documento histórico no sustituye el canal actual.",
  result: "Información anual sin nuevo ingreso.",
  included: [
    "Documentos, nominales y cuotas del 615.",
    "Identificación y desglose exigidos por el diseño vigente.",
  ],
  excluded: [
    "Un segundo pago.",
    "Operaciones del Modelo 610/611.",
    "PDF histórico en una campaña actual.",
  ],
  preparation: [
    "Todos los Modelos 615 del ejercicio.",
    "Correcciones y justificantes.",
    "Validación contra el diseño de registro.",
  ],
  commonMistakes: [
    "Duplicar cuotas ya ingresadas.",
    "Omitir documentos de un periodo corregido.",
    "Usar el formulario antiguo.",
  ],
  correction:
    "Revisa el 615 de origen y utiliza el mecanismo electrónico de complementaria o sustitutiva indicado para el 616.",
  procedureSourceId: "aeat.model-616.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-616.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-616.tgvi-help.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Formulario histórico anterior a 2015",
      sourceId: "aeat.model-616.legacy-form-before-2015.2026-07-14",
    },
  ],
  legalSourceIds: ["boe.order-eha-3062-2010.consolidated.2026-07-14"],
  related: [
    {
      code: "615",
      href: "/consultor-fiscal/modelos/615",
      description: "Ingreso periódico cuyos documentos resume el 616.",
    },
  ],
  specificFaq: [
    {
      question: "¿Genera un pago?",
      answer: "No. Es una declaración anual informativa.",
    },
    {
      question: "¿Debe coincidir con el 615?",
      answer:
        "Sí. Los totales y desgloses deben conciliarse con todos los periodos y correcciones 615 del ejercicio.",
    },
  ],
});

export const MODEL_620_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "620",
  category: CATEGORY,
  statusLabel: "Competencia territorial limitada",
  statusTone: "territorial",
  territorialGate: true,
  pdfAdobeWarning: true,
  intro: [
    "El Modelo 620 autoliquida el ITP por la transmisión entre particulares de determinados vehículos, embarcaciones o aeronaves usados cuando la gestión es estatal.",
    "El comprador suele ser el sujeto pasivo y debe presentar un modelo por cada medio de transporte.",
  ],
  notices: [
    {
      title: "Pago fiscal y cambio de titularidad son trámites distintos",
      paragraphs: [
        "El plazo estatal general es de 30 días hábiles. Pagar el 620 no cambia la titularidad en Tráfico ni en otro registro, y una compra empresarial sujeta a IVA no se tramita igual.",
      ],
    },
  ],
  type: "Autoliquidación de ITP",
  presenter:
    "El comprador de un vehículo, embarcación o aeronave usada adquirida entre particulares, ante la Administración territorial competente.",
  nonPresenter:
    "Quien compra a un empresario en una operación sujeta a IVA, el vendedor por esa sola condición o quien deba usar el formulario autonómico/foral.",
  periodicity: "No periódica; un modelo por cada medio de transporte.",
  deadline: "En competencia estatal, 30 días hábiles desde la compraventa.",
  channel:
    "Formulario, pago y documentación ante la Administración competente; después debe tramitarse por separado el cambio registral.",
  result: "Cuota de ITP a ingresar o situación exenta/no sujeta justificada.",
  included: [
    "Vehículos usados comprados entre particulares.",
    "Embarcaciones de recreo y aeronaves usadas incluidas.",
    "Datos de comprador, vendedor, contrato, matrícula/bastidor y valor fiscal.",
  ],
  excluded: [
    "Compra empresarial sujeta a IVA.",
    "Cambio de titularidad registral.",
    "Varios vehículos en un único Modelo 620.",
  ],
  preparation: [
    "Contrato y fecha, identificación de las partes.",
    "Permiso de circulación, ficha técnica, matrícula y bastidor.",
    "Tablas oficiales, antigüedad, marca/modelo y justificantes de exención.",
  ],
  commonMistakes: [
    "Presentarlo siempre en la AEAT.",
    "Declarar varios vehículos juntos.",
    "Creer que sustituye el trámite de Tráfico.",
  ],
  correction:
    "Si falta cuota, presenta complementaria; si pagaste de más, solicita rectificación/devolución ante la Administración competente y corrige por separado el registro si procede.",
  procedureSourceId: GC12_HOME,
  recordSourceId: GC12_RECORD,
  helpSourceId: GC12_TOPIC,
  document: {
    label: "Formulario oficial PDF del Modelo 620",
    sourceId: "aeat.model-620.form-pdf",
  },
  legalSourceIds: [
    "boe.order-4-july-2001-itpajd.original",
    "boe.order-hac-1927-2002.original",
  ],
  related: [
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description: "Autoliquidación general de ITP y AJD.",
    },
    {
      code: "576",
      href: "/consultor-fiscal/modelos/576",
      description:
        "Solicitud sectorial de devolución por envío definitivo de medios de transporte.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta uno por vehículo?",
      answer:
        "Sí, el formulario estatal se prepara por cada vehículo, embarcación o aeronave.",
    },
    {
      question: "¿Sustituye el cambio de titularidad?",
      answer:
        "No. La liquidación fiscal y la inscripción en Tráfico u otro registro son actuaciones distintas.",
    },
    {
      question: "¿Qué valor se declara?",
      answer:
        "Debe contrastarse precio, tablas oficiales, antigüedad y reglas del territorio; no se usa automáticamente una cifra genérica.",
    },
  ],
});

export const MODEL_630_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "630",
  category: CATEGORY,
  statusLabel: "Competencia territorial limitada",
  statusTone: "territorial",
  territorialGate: true,
  pdfAdobeWarning: true,
  intro: [
    "El Modelo 630 satisface en metálico la cuota complementaria de AJD de determinadas letras de cambio y otros documentos mercantiles.",
    "Solo se utiliza cuando el documento está incluido y el efecto timbrado no cubre íntegramente la cuota; el umbral y la escala deben verificarse en el formulario vigente.",
  ],
  notices: [
    {
      title: "No es un pago genérico para pagarés o contratos",
      paragraphs: [
        "Puede alcanzar letras de importe elevado o documentos expedidos en el extranjero que surtan efectos en España. Deben comprobarse documento, cuota ya cubierta, competencia y plazo estatal.",
      ],
    },
  ],
  type: "Pago complementario de AJD",
  presenter:
    "El sujeto obligado respecto de la letra o documento mercantil sujeto, ante la Administración competente.",
  nonPresenter:
    "Quien firma un contrato o pagaré no incluido, ni quien deba utilizar 610 o 615.",
  periodicity: "No periódica, vinculada al documento.",
  deadline:
    "El plazo estatal se obtiene de las instrucciones vigentes del Modelo 630 y de la fecha/efecto del documento.",
  channel: "Formulario PDF e ingreso ante la Administración competente.",
  result:
    "Cuota complementaria a ingresar sobre la ya cubierta por timbre o efecto.",
  included: [
    "Determinadas letras de cambio cuyo timbre no cubre toda la cuota.",
    "Ciertos documentos expedidos en el extranjero con efectos en España.",
    "Nominal, vencimiento, cuota cubierta y diferencia.",
  ],
  excluded: [
    "Cualquier letra, contrato o pagaré.",
    "Pago periódico de documentos negociados del 610.",
    "Documentos emitidos bajo el régimen 615.",
  ],
  preparation: [
    "Documento original, fecha, nominal y vencimiento.",
    "Partes intervinientes y efectos en España.",
    "Timbre/cuota satisfecha y cálculo complementario según escala vigente.",
  ],
  commonMistakes: [
    "Aplicar un umbral antiguo.",
    "Omitir la cuota ya cubierta por el timbre.",
    "No comprobar la competencia territorial.",
  ],
  correction:
    "Regulariza la diferencia mediante complementaria o solicita rectificación/devolución con el documento y el pago original.",
  procedureSourceId: "aeat.model-630.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-630.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-630.instructions-html.2026-07-14",
  document: {
    label: "Formulario oficial PDF del Modelo 630",
    sourceId: "aeat.model-630.form-pdf.2026-07-14",
  },
  legalSourceIds: ["boe.order-model-630-2001.consolidated.2026-07-14"],
  related: [
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description: "Autoliquidación general de ITP y AJD.",
    },
    {
      code: "610",
      href: "/consultor-fiscal/modelos/610",
      description:
        "Pago en metálico de documentos negociados por entidades colaboradoras.",
    },
    {
      code: "615",
      href: "/consultor-fiscal/modelos/615",
      description:
        "Pago en metálico de documentos emitidos con función de giro.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué significa pago complementario?",
      answer:
        "Es la diferencia entre la cuota exigible y la cubierta por el timbre o efecto disponible, cuando la norma permite este modelo.",
    },
    {
      question: "¿Qué ocurre con una letra extranjera?",
      answer:
        "Puede estar incluida si surte efectos en España, pero deben verificarse la norma, competencia y datos del documento.",
    },
  ],
});

function inheritanceGuide(
  spec: Parameters<typeof createBatch5PracticalGuideV1>[0],
) {
  return createBatch5PracticalGuideV1(spec);
}

export const MODEL_650_GUIDE_V1 = inheritanceGuide({
  code: "650",
  category: CATEGORY,
  statusLabel: "Competencia estatal, autonómica o foral",
  statusTone: "territorial",
  territorialGate: true,
  intro: [
    "El Modelo 650 autoliquida el Impuesto sobre Sucesiones por herencias, legados y determinados seguros recibidos a causa de un fallecimiento.",
    "Cada heredero, legatario o beneficiario presenta su propia autoliquidación y debe determinar antes la Administración competente.",
  ],
  notices: [
    {
      title: "No existe una escala o bonificación nacional única",
      paragraphs: [
        "La AEAT ofrece vías específicas para no residentes y Ceuta/Melilla. Reducciones, tarifa, coeficientes, bonificaciones y reglas forales o autonómicas dependen del caso.",
      ],
    },
  ],
  type: "Autoliquidación de Sucesiones",
  presenter:
    "Cada heredero, legatario o beneficiario de seguro por fallecimiento, ante la Administración estatal, autonómica o foral competente.",
  nonPresenter:
    "La herencia como una única entidad, otro coheredero por todos sin representación, o quien deba declarar ante otra Administración.",
  periodicity: "No periódica; se devenga con el fallecimiento.",
  deadline:
    "Plazo estatal general de seis meses desde el fallecimiento. La prórroga se solicita dentro de los primeros cinco meses.",
  channel:
    "Vías diferenciadas para no residentes y Ceuta/Melilla en la AEAT; en los demás casos, canal autonómico o foral competente.",
  result:
    "Cuota individual a ingresar, posible aplazamiento/fraccionamiento, exención o bonificación si se acredita.",
  included: [
    "Herencias, legados y seguros de vida por fallecimiento.",
    "Bienes, derechos, deudas y gastos deducibles del causante.",
    "Parentesco, patrimonio preexistente, reducciones y bonificaciones territoriales.",
  ],
  excluded: [
    "Donaciones entre vivos, que se revisan con el 651.",
    "Una declaración única para todos los herederos.",
    "Una tarifa estatal universal.",
  ],
  preparation: [
    "Certificado de defunción y últimas voluntades, testamento o declaración de herederos.",
    "Inventario, escrituras, certificados bancarios, valores, seguros, deudas y gastos.",
    "Autoliquidación individual y acreditación de parentesco/beneficios.",
  ],
  commonMistakes: [
    "Presentar un único 650 para toda la herencia.",
    "Ignorar la residencia del causante/adquirente o la localización de bienes.",
    "Solicitar la prórroga después del quinto mes.",
  ],
  correction:
    "Presenta complementaria si aumenta la cuota; para reducirla, solicita rectificación/devolución ante la Administración competente, conservando la partición y valoración corregidas.",
  procedureSourceId: "aeat.model-650.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-650.procedure-record.2026-07-14",
  helpSourceId: "aeat.models-650-651-655.faq.2026-07-14",
  document: {
    label: "Formulario oficial PDF del Modelo 650",
    sourceId: "aeat.model-650.form-pdf.2026-07-14",
  },
  legalSourceIds: [
    "boe.law-29-1987.consolidated.2026-07-14",
    "boe.rd-1629-1991.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "651",
      href: "/consultor-fiscal/modelos/651",
      description: "Donaciones y adquisiciones gratuitas entre vivos.",
    },
    {
      code: "655",
      href: "/consultor-fiscal/modelos/655",
      description: "Consolidación del dominio al extinguirse un usufructo.",
    },
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description: "ITP y AJD de operaciones patrimoniales.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description:
        "IRPF del heredero; la adquisición hereditaria no se confunde con la renta posterior de los bienes.",
    },
  ],
  specificFaq: [
    {
      question: "¿Presenta un modelo toda la herencia?",
      answer:
        "No. Cada heredero, legatario o beneficiario presenta su autoliquidación individual.",
    },
    {
      question: "¿Puede pedirse prórroga?",
      answer:
        "En la regla estatal, debe solicitarse dentro de los primeros cinco meses del plazo de seis meses.",
    },
    {
      question: "¿Se incluye un seguro de vida?",
      answer:
        "Determinados seguros recibidos por fallecimiento se integran en la liquidación del beneficiario.",
    },
  ],
});

export const MODEL_651_GUIDE_V1 = inheritanceGuide({
  code: "651",
  category: CATEGORY,
  statusLabel: "Competencia estatal, autonómica o foral",
  statusTone: "territorial",
  territorialGate: true,
  intro: [
    "El Modelo 651 autoliquida las donaciones y otras adquisiciones gratuitas entre personas vivas.",
    "Lo presenta el donatario y la competencia depende, entre otros factores, del tipo/localización del bien y de la residencia; la AEAT separa no residentes y Ceuta/Melilla.",
  ],
  notices: [
    {
      title: "Una transferencia familiar también puede ser donación",
      paragraphs: [
        "La ausencia de escritura no elimina por sí sola el impuesto. La escritura puede ser necesaria para ciertos beneficios y el donante puede tener consecuencias en IRPF.",
      ],
    },
  ],
  type: "Autoliquidación de Donaciones",
  presenter:
    "La persona que recibe gratuitamente el bien o derecho (donatario), ante la Administración competente.",
  nonPresenter:
    "El donante como sujeto pasivo del ISD por esa donación, ni quien debe autoliquidar ante otra comunidad o territorio foral.",
  periodicity:
    "No periódica; se devenga con la donación o adquisición gratuita.",
  deadline:
    "Plazo estatal general de 30 días hábiles; comprueba el plazo autonómico o foral aplicable.",
  channel:
    "Trámite AEAT específico para no residentes y Ceuta/Melilla o canal autonómico/foral competente.",
  result:
    "Cuota del donatario, con beneficios solo si cumple y acredita la normativa territorial.",
  included: [
    "Dinero, inmuebles, acciones, participaciones, negocios o condonaciones gratuitas.",
    "Valor/valor de referencia, parentesco, patrimonio preexistente y beneficios territoriales.",
  ],
  excluded: [
    "Herencias o legados del 650.",
    "Consecuencias en IRPF del donante.",
    "Una bonificación nacional automática.",
  ],
  preparation: [
    "Documento o escritura de donación, transferencia y origen de fondos.",
    "Identificación, parentesco, fecha, valor y localización de bienes.",
    "Requisitos formales del beneficio fiscal y efectos del donante.",
  ],
  commonMistakes: [
    "Pensar que una transferencia familiar no tributa.",
    "Confundir sujeto pasivo y donante.",
    "Aplicar una bonificación sin cumplir escritura/plazo/territorio.",
  ],
  correction:
    "Usa complementaria si aumenta la cuota o rectificación/devolución si disminuye, ante la Administración competente; revisa separadamente IRPF y plusvalía municipal si proceden.",
  procedureSourceId: "aeat.model-651.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-651.procedure-record.2026-07-14",
  helpSourceId: "aeat.models-650-651-655.faq.2026-07-14",
  document: {
    label: "Formulario oficial PDF del Modelo 651",
    sourceId: "aeat.model-651.form-pdf.2026-07-14",
  },
  legalSourceIds: [
    "boe.law-29-1987.consolidated.2026-07-14",
    "boe.rd-1629-1991.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "650",
      href: "/consultor-fiscal/modelos/650",
      description: "Herencias y legados mortis causa.",
    },
    {
      code: "655",
      href: "/consultor-fiscal/modelos/655",
      description: "Consolidación de dominio tras un usufructo.",
    },
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description: "Operaciones patrimoniales onerosas.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description: "IRPF, relevante para los posibles efectos del donante.",
    },
  ],
  specificFaq: [
    {
      question: "¿Quién paga el impuesto?",
      answer:
        "El donatario, es decir, quien recibe el bien o derecho gratuitamente.",
    },
    {
      question: "¿Hace falta escritura?",
      answer:
        "La donación puede existir sin escritura, pero la forma pública puede ser requisito de validez o de beneficios fiscales según el bien y territorio.",
    },
    {
      question: "¿El donante tributa en Renta?",
      answer:
        "Puede generar una ganancia o pérdida patrimonial; debe revisarse por separado en el IRPF del donante.",
    },
  ],
});

export const MODEL_655_GUIDE_V1 = inheritanceGuide({
  code: "655",
  category: CATEGORY,
  statusLabel: "Competencia estatal, autonómica o foral",
  statusTone: "territorial",
  territorialGate: true,
  intro: [
    "El Modelo 655 autoliquida la consolidación del dominio cuando la nuda propiedad y el usufructo vuelven a reunirse.",
    "La causa de extinción y la forma en que nació el usufructo determinan la norma, base y plazo; hay que recuperar la autoliquidación original.",
  ],
  notices: [
    {
      title: "No toda extinción de usufructo se calcula igual",
      paragraphs: [
        "Fallecimiento, cumplimiento del plazo, renuncia o reunión de derechos pueden producir tratamientos distintos. No se aplica automáticamente el valor actual completo.",
      ],
    },
  ],
  type: "Autoliquidación por consolidación de dominio",
  presenter:
    "La persona en la que se consolida la plena propiedad, según la causa y el título original, ante la Administración competente.",
  nonPresenter:
    "Quien no adquiere la plena propiedad o pretende aplicar el modelo sin identificar la constitución y extinción del usufructo.",
  periodicity: "No periódica; nace al extinguirse el usufructo.",
  deadline:
    "Depende de la causa: fallecimiento, plazo, renuncia u otra. Debe revisarse el plazo sucesorio, inter vivos o patrimonial aplicable.",
  channel:
    "Trámite estatal para sus supuestos o canal autonómico/foral competente, aportando el título original y la causa de extinción.",
  result:
    "Cuota por el porcentaje del dominio no liquidado inicialmente, calculada con la norma aplicable.",
  included: [
    "Usufructo vitalicio o temporal constituido por herencia, donación u operación onerosa.",
    "Extinción por fallecimiento, plazo, renuncia, reunión u otra causa.",
    "Porcentaje no liquidado, modelo previo y beneficios aplicables.",
  ],
  excluded: [
    "Transmitir una plena propiedad nueva sin usufructo previo.",
    "Aplicar siempre el valor completo actual.",
    "Ignorar si el origen fue 600, 650 o 651.",
  ],
  preparation: [
    "Escritura/título de constitución y autoliquidación original.",
    "Certificado de defunción, documento de renuncia o prueba del plazo/causa.",
    "Valor original/actual y porcentaje ya liquidado.",
  ],
  commonMistakes: [
    "No localizar el modelo original.",
    "Tratar una renuncia como un fallecimiento.",
    "Usar un plazo único para todas las causas.",
  ],
  correction:
    "Rectifica o complementa la consolidación ante la Administración competente, conservando el título original, la causa y la liquidación previa.",
  procedureSourceId: "aeat.model-655.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-655.procedure-record.2026-07-14",
  helpSourceId: "aeat.models-650-651-655.faq.2026-07-14",
  document: {
    label: "Formulario oficial PDF del Modelo 655",
    sourceId: "aeat.model-655.form-pdf.2026-07-14",
  },
  legalSourceIds: [
    "boe.law-29-1987.consolidated.2026-07-14",
    "boe.rd-1629-1991.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "650",
      href: "/consultor-fiscal/modelos/650",
      description: "Herencia que pudo originar el usufructo.",
    },
    {
      code: "651",
      href: "/consultor-fiscal/modelos/651",
      description: "Donación que pudo originar el usufructo.",
    },
    {
      code: "600",
      href: "/consultor-fiscal/modelos/600",
      description: "Constitución onerosa patrimonial del usufructo.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué es consolidar el dominio?",
      answer:
        "Es reunir nuda propiedad y usufructo en una misma persona, recuperando la plena propiedad.",
    },
    {
      question: "¿Qué modelo anterior necesito?",
      answer:
        "El que documentó la constitución o primera liquidación: puede ser 600, 650 o 651, según el origen.",
    },
    {
      question: "¿Qué ocurre con una renuncia?",
      answer:
        "Debe analizarse como causa específica; no se equipara automáticamente al fallecimiento del usufructuario.",
    },
  ],
});
