import { createBatch3PracticalGuideV1 } from "./create-batch-3-practical-guide.v1";

export const MODEL_504_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "504",
  category: "Impuestos Especiales · Movimientos UE",
  statusLabel: "Solicitud vigente · Orden HFP/626/2023",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 504 es la solicitud de autorización para determinadas expediciones o recepciones de productos sujetos a Impuestos Especiales con destino a o procedentes de otro Estado miembro.",
    "La AEAT mantiene en 2026 el procedimiento 504/505 para operadores no registrados, envíos garantizados y representantes fiscales de ventas a distancia, bajo la Orden HFP/626/2023.",
  ],
  notices: [
    {
      title: "El 504 solicita y el 505 autoriza",
      paragraphs: [
        "No son dos autoliquidaciones. El interesado presenta la solicitud 504 y la Administración expide, cuando procede, la autorización 505 vinculada a la operación.",
      ],
    },
  ],
  type: "Solicitud electrónica de autorización de movimiento UE.",
  presenter:
    "Operador no registrado, receptor en envíos garantizados o representante fiscal de ventas a distancia que encaje en el procedimiento.",
  nonPresenter:
    "Cualquier comprador intracomunitario, un operador ya cubierto por otro registro o quien comercia con productos no sujetos a Impuestos Especiales.",
  periodicity: "Por operación o autorización solicitada.",
  deadline:
    "Antes del movimiento y con la antelación exigida para obtener la autorización y cumplir garantías y EMCS.",
  channel:
    "Solicitud electrónica 504 con identificación, productos, origen/destino, garantía y datos del movimiento.",
  result:
    "Puede generar autorización 505, requerimiento o denegación; presentar la solicitud no autoriza por sí sola el movimiento.",
  included: [
    "Productos sujetos a Impuestos Especiales de fabricación.",
    "Expedidor, destinatario, Estado miembro y establecimiento.",
    "Garantía, registro, CAE/SEED y condición del operador.",
    "Datos necesarios para el movimiento y su control EMCS.",
  ],
  excluded: [
    "Adquisición intracomunitaria ordinaria de otros productos.",
    "Autorización administrativa 505 ya expedida.",
    "Autoliquidación de la cuota del impuesto.",
    "Registro permanente inferido por una sola solicitud.",
  ],
  preparation: [
    "Confirmar la condición exacta del operador.",
    "Identificar producto, cantidad, origen y destino.",
    "Constituir la garantía cuando proceda.",
    "Coordinar autorización y documento electrónico de circulación.",
  ],
  correction:
    "Actualiza o subsana la solicitud por el expediente antes del movimiento; si cambian producto, cantidad, operador o destino, comprueba si se exige una nueva autorización.",
  procedureSourceId: "aeat.models-504-505.procedure-home.2026-03-25",
  recordSourceId: "aeat.models-504-505.procedure-record.2026-03-02",
  legalSourceIds: ["boe.models-504-505.order-hfp-626-2023.original"],
  related: [
    {
      code: "505",
      href: "/consultor-fiscal/modelos/505",
      description: "Autorización administrativa emitida tras la solicitud.",
    },
    {
      code: "510",
      href: "/consultor-fiscal/modelos/510",
      description: "Declaración de determinadas recepciones desde la UE.",
    },
  ],
  specificFaq: [
    {
      question: "¿Ha sido sustituido completamente por EMCS?",
      answer:
        "No. La AEAT mantiene un procedimiento actual 504/505 bajo la Orden HFP/626/2023 para los supuestos concretos indicados; EMCS forma parte del control del movimiento.",
    },
    {
      question: "¿La solicitud permite iniciar el movimiento?",
      answer:
        "No por sí sola. Debe obtenerse la autorización y cumplirse garantía, registro y requisitos de circulación.",
    },
  ],
});

export const MODEL_505_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "505",
  category: "Impuestos Especiales · Movimientos UE",
  statusLabel: "Autorización administrativa · No se presenta sola",
  statusTone: "auxiliary",
  effectiveYear: 2026,
  intro: [
    "El Modelo 505 es la autorización administrativa de expedición o recepción vinculada a determinadas operaciones con productos sujetos a Impuestos Especiales dentro de la Unión Europea.",
    "No es una autoliquidación ni un formulario independiente que el contribuyente deba presentar: deriva de la solicitud 504 y lo expide la Administración.",
  ],
  notices: [
    {
      title: "Documento emitido por Hacienda",
      paragraphs: [
        "La Orden HFP/626/2023 mantiene el par 504/505. El interesado solicita con el 504 y consulta o utiliza la autorización 505 dentro de sus límites.",
      ],
    },
  ],
  type: "Autorización administrativa vinculada a una solicitud.",
  presenter:
    "No tiene presentación independiente: la Administración la emite tras resolver la solicitud 504 del operador.",
  nonPresenter:
    "El operador no cumplimenta un 505 aislado ni lo utiliza como autoliquidación o sustituto de EMCS.",
  periodicity:
    "Por autorización concedida para la operación o periodo indicado.",
  deadline:
    "Debe obtenerse antes de realizar el movimiento y utilizarse dentro de su vigencia y condiciones.",
  channel:
    "Consulta y gestión dentro del expediente electrónico 504/505; no existe una acción separada de presentar un 505.",
  result:
    "Autoriza en sus términos una expedición o recepción concreta; no liquida automáticamente el impuesto.",
  included: [
    "Número y periodo de validez de la autorización.",
    "Operador, productos, cantidades, expedidor y destinatario.",
    "Estado miembro, garantía y condiciones impuestas.",
    "Referencia para el movimiento y su control.",
  ],
  excluded: [
    "Solicitud inicial del Modelo 504.",
    "Autoliquidación del impuesto.",
    "Autorización genérica para cualquier operación futura.",
    "Sustitución del documento electrónico EMCS.",
  ],
  preparation: [
    "Conservar la solicitud 504 y la resolución.",
    "Comprobar producto, cantidades y vigencia.",
    "Entregar la referencia a las partes que proceda.",
    "Conciliar recepción, incidencias e impuesto devengado.",
  ],
  correction:
    "No edites la autorización. Comunica cambios o errores en el expediente y solicita la modificación o nueva autorización que corresponda.",
  procedureSourceId: "aeat.models-504-505.procedure-home.2026-03-25",
  recordSourceId: "aeat.models-504-505.procedure-record.2026-03-02",
  legalSourceIds: ["boe.models-504-505.order-hfp-626-2023.original"],
  allowProcedureAction: false,
  readOnlyActionLabel: "Consultar solicitudes y autorizaciones 504/505",
  related: [
    {
      code: "504",
      href: "/consultor-fiscal/modelos/504",
      description: "Solicitud que inicia el expediente de autorización.",
    },
    {
      code: "510",
      href: "/consultor-fiscal/modelos/510",
      description: "Declaración de determinadas recepciones desde la UE.",
    },
  ],
  specificFaq: [
    {
      question: "¿Quién cumplimenta el Modelo 505?",
      answer:
        "La Administración lo expide como autorización; el operador presenta la solicitud 504.",
    },
    {
      question: "¿Existe un botón independiente para presentarlo?",
      answer:
        "No debe existir. La gestión se realiza dentro del procedimiento conjunto 504/505.",
    },
  ],
});

export const MODEL_506_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "506",
  category: "Impuestos Especiales · Devoluciones",
  statusLabel: "Solicitud trimestral de devolución",
  statusTone: "current",
  intro: [
    "El Modelo 506 solicita la devolución de cuotas de Impuestos Especiales previamente soportadas cuando los productos se introducen en un depósito fiscal y se cumplen los requisitos del supuesto.",
    "No corresponde a cualquier entrada en almacén ni produce una devolución automática.",
  ],
  notices: [
    {
      title: "Depósito fiscal, cuota soportada y trazabilidad",
      paragraphs: [
        "Deben acreditarse el impuesto pagado, la introducción en un depósito fiscal autorizado y la circulación o destino que fundamenta la devolución.",
      ],
    },
  ],
  type: "Solicitud trimestral de devolución de Impuestos Especiales.",
  presenter:
    "Operador con derecho a devolución que introduce productos con impuesto soportado en un depósito fiscal autorizado.",
  nonPresenter:
    "Titular de un almacén ordinario o quien no acredita cuota soportada, depósito fiscal y destino exigido.",
  periodicity: "Trimestral.",
  deadline:
    "Durante los veinte primeros días del mes siguiente al trimestre en que se produce el hecho que fundamenta la devolución.",
  channel: "Presentación electrónica con relación de operaciones y documentos.",
  result:
    "Solicitud susceptible de devolución total o parcial, requerimiento o denegación.",
  included: [
    "Producto, cantidad y cuota previamente soportada.",
    "Depósito fiscal, titular, depositante y CAE.",
    "Documentos de circulación, ARC y prueba de destino.",
    "Trimestre y relación de operaciones.",
  ],
  excluded: [
    "Entrada en almacén no autorizado.",
    "Cuota no acreditada.",
    "Venta a distancia del Modelo 508.",
    "Devolución por exportación del Modelo 590.",
  ],
  preparation: [
    "Acreditar pago o repercusión de la cuota.",
    "Identificar depósito fiscal y CAE.",
    "Reunir documentos EMCS y prueba de llegada.",
    "Conciliar cantidades y cuota solicitada.",
  ],
  correction:
    "Subsanar el expediente o presentar la corrección admitida, manteniendo la referencia de cada movimiento y evitando solicitar dos veces la misma cuota.",
  procedureSourceId: "aeat.model-506.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-506.procedure-record.2026-06-09",
  document: {
    label: "Formulario oficial del Modelo 506",
    sourceId: "aeat.model-506.official-form.pdf",
  },
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales del Modelo 506",
      sourceId: "aeat.model-506.instructions.pdf",
    },
  ],
  legalSourceIds: ["boe.excise-models.order-eha-3482-2007.original"],
  related: [
    {
      code: "510",
      href: "/consultor-fiscal/modelos/510",
      description: "Declaración de determinadas recepciones desde la UE.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación del Impuesto sobre Hidrocarburos.",
    },
    {
      code: "590",
      href: "/consultor-fiscal/modelos/590",
      description: "Devolución por exportación o reexpedición.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sirve para cualquier depósito?",
      answer:
        "No. Debe tratarse de un depósito fiscal autorizado y cumplirse el supuesto de devolución.",
    },
    {
      question: "¿Cuándo nace el derecho?",
      answer:
        "Cuando se cumplen conjuntamente los requisitos materiales y documentales; la entrada física por sí sola no basta.",
    },
  ],
});

export const MODEL_507_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "507",
  category: "Impuestos Especiales · Envíos garantizados",
  statusLabel: "Vigente · Procedimiento armonizado 2023",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 507 solicita la devolución en el sistema de envíos garantizados para productos con Impuestos Especiales ya pagados que circulan a otro Estado miembro en los supuestos admitidos.",
    "Aunque existen formularios antiguos descargables, la AEAT mantiene un procedimiento actual regulado por la Orden HFP/626/2023 y coordinado con EMCS y los operadores certificados.",
  ],
  notices: [
    {
      title: "No es un modelo derogado en 2026",
      paragraphs: [
        "La fuente oficial vigente de 2023 aprueba expresamente el Modelo 507. Debe utilizarse el canal electrónico actual y no un formulario en papel histórico.",
      ],
    },
  ],
  type: "Solicitud de devolución en envíos garantizados.",
  presenter:
    "Expedidor u operador con derecho a devolución que acredita impuesto pagado en origen y recepción e imposición en destino.",
  nonPresenter:
    "Cualquier vendedor intracomunitario, un destinatario sin la condición exigida o quien no acredita la circulación armonizada.",
  periodicity: "Por las operaciones o solicitudes comprendidas en el sistema.",
  deadline:
    "En el plazo del procedimiento vigente, una vez reunida la prueba de recepción y pago o devengo en destino.",
  channel:
    "Presentación electrónica bajo la Orden HFP/626/2023 y coordinación con EMCS.",
  result:
    "Solicitud de devolución, sujeta a comprobación, requerimiento y eventual aceptación total o parcial.",
  included: [
    "Productos con impuesto pagado enviados a otro Estado miembro.",
    "Expedidor y destinatario certificados cuando corresponda.",
    "EMCS, referencia del movimiento, recepción y garantía.",
    "Prueba del impuesto en origen y destino.",
  ],
  excluded: [
    "Operaciones nacionales.",
    "Movimiento en régimen suspensivo tratado por otro procedimiento.",
    "Formulario histórico en papel como canal actual.",
    "Venta a distancia del Modelo 508.",
  ],
  preparation: [
    "Comprobar condición de expedidor y destinatario.",
    "Conciliar referencias EMCS y recepción.",
    "Acreditar cuota pagada en origen y destino.",
    "Evitar duplicidades con otras devoluciones.",
  ],
  correction:
    "Subsanar la solicitud electrónica con las referencias armonizadas; no reutilices un formulario histórico ni cambies la identidad del movimiento.",
  procedureSourceId: "aeat.model-507.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-507.procedure-record.2026-06-09",
  legalSourceIds: ["boe.guaranteed-movements.order-hfp-626-2023.original"],
  related: [
    {
      code: "504",
      href: "/consultor-fiscal/modelos/504",
      description: "Solicitud de autorización de determinados movimientos UE.",
    },
    {
      code: "505",
      href: "/consultor-fiscal/modelos/505",
      description: "Autorización administrativa vinculada al movimiento.",
    },
    {
      code: "508",
      href: "/consultor-fiscal/modelos/508",
      description: "Devolución específica del sistema de ventas a distancia.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puede presentarse para una operación de 2026?",
      answer:
        "Sí, si encaja en el procedimiento actual y cumple la Orden HFP/626/2023; no debe usarse el soporte histórico descargable como canal vigente.",
    },
    {
      question: "¿Qué papel tiene EMCS?",
      answer:
        "Aporta la trazabilidad armonizada del movimiento y debe conciliarse con la solicitud y la prueba de recepción.",
    },
  ],
});

export const MODEL_508_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "508",
  category: "Impuestos Especiales · Ventas a distancia",
  statusLabel: "Solicitud trimestral de devolución",
  statusTone: "current",
  intro: [
    "El Modelo 508 solicita la devolución de Impuestos Especiales en determinadas ventas a distancia de productos enviados a consumidores de otro Estado miembro.",
    "No se aplica a cualquier ecommerce y es independiente de la liquidación de IVA mediante OSS.",
  ],
  notices: [
    {
      title: "Impuesto Especial pagado en destino",
      paragraphs: [
        "Debe acreditarse la cuota soportada en España, el envío y el pago o devengo del Impuesto Especial en el Estado de destino.",
      ],
    },
  ],
  type: "Solicitud trimestral de devolución en ventas a distancia.",
  presenter:
    "Vendedor u operador con derecho a devolución por una venta a distancia de productos sujetos a Impuestos Especiales.",
  nonPresenter:
    "Cualquier tienda online, el consumidor final o quien vende bienes no sujetos a estos impuestos.",
  periodicity: "Trimestral.",
  deadline:
    "Durante los veinte primeros días del mes siguiente al trimestre en que se pagó o cargó el impuesto en destino.",
  channel:
    "Presentación electrónica con relación de operaciones y justificantes.",
  result:
    "Solicitud de devolución total o parcial, sujeta a comprobación; no devuelve el IVA.",
  included: [
    "Producto sujeto, cantidad, factura y entrega.",
    "Consumidor y Estado miembro de destino.",
    "Cuota pagada en España y en destino.",
    "Representación y documentos de circulación cuando procedan.",
  ],
  excluded: [
    "Venta online de bienes ordinarios.",
    "IVA OSS del Modelo 369.",
    "Operaciones intracomunitarias B2B del Modelo 349.",
    "Envíos garantizados del Modelo 507.",
  ],
  preparation: [
    "Clasificar el producto sujeto.",
    "Acreditar entrega al consumidor y Estado de destino.",
    "Reunir prueba de ambas cuotas.",
    "Conciliar representante, documentos y trimestre.",
  ],
  correction:
    "Subsanar o rectificar la solicitud por operación, conservando la factura y las pruebas de imposición en origen y destino.",
  procedureSourceId: "aeat.model-508.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-508.procedure-record.2026-06-09",
  document: {
    label: "Formulario oficial del Modelo 508",
    sourceId: "aeat.model-508.official-form.pdf",
  },
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales del Modelo 508",
      sourceId: "aeat.model-508.instructions.pdf",
    },
  ],
  legalSourceIds: ["boe.excise-models.order-eha-3482-2007.original"],
  related: [
    {
      code: "369",
      href: "/consultor-fiscal/modelos/369",
      description: "IVA de los regímenes OSS/IOSS.",
    },
    {
      code: "349",
      href: "/consultor-fiscal/modelos/349",
      description: "Operaciones intracomunitarias B2B.",
    },
    {
      code: "510",
      href: "/consultor-fiscal/modelos/510",
      description: "Declaración de determinadas recepciones desde la UE.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sirve para cualquier ecommerce?",
      answer:
        "No. Solo para ventas a distancia de productos sujetos a Impuestos Especiales que cumplen los requisitos de destino y devolución.",
    },
    {
      question: "¿Se relaciona con OSS?",
      answer:
        "Puede coexistir en una venta, pero el 508 trata Impuestos Especiales y el 369 trata IVA; no se sustituyen.",
    },
  ],
});

export const MODEL_510_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "510",
  category: "Impuestos Especiales · Recepciones UE",
  statusLabel: "Declaración de operaciones",
  statusTone: "current",
  intro: [
    "El Modelo 510 declara determinadas operaciones de recepción de productos sujetos a Impuestos Especiales procedentes de otros Estados miembros.",
    "No se presenta por cualquier adquisición intracomunitaria y debe coordinarse con la condición del operador, EMCS y la contabilidad reglamentaria.",
  ],
  notices: [
    {
      title: "Recepción sectorial, no declaración general de compras UE",
      paragraphs: [
        "Solo afecta a receptores y operaciones definidos por la normativa. Periodicidad y obligación sin operaciones deben comprobarse según el tipo de operador.",
      ],
    },
  ],
  type: "Declaración de operaciones de recepción UE.",
  presenter:
    "Destinatario registrado, receptor autorizado u operador obligado por recepciones sujetas desde otro Estado miembro.",
  nonPresenter:
    "Cualquier empresa que compra en la UE, un destinatario fuera del sistema o quien solo declara IVA intracomunitario.",
  periodicity:
    "La correspondiente al operador y a su periodo de liquidación; no debe presumirse trimestral para todos.",
  deadline:
    "En el plazo oficial asociado al periodo y condición del receptor, comprobado en la sede para el ejercicio.",
  channel:
    "Presentación electrónica con datos de operaciones y establecimiento.",
  result:
    "Información y control de recepciones; no sustituye la autoliquidación del Impuesto Especial ni del IVA.",
  included: [
    "Expedidor, Estado de procedencia y destinatario.",
    "Producto, epígrafe, cantidad y fecha de recepción.",
    "CAE, ARC y referencia EMCS.",
    "Incidencias y establecimiento receptor.",
  ],
  excluded: [
    "Adquisición intracomunitaria ordinaria de IVA.",
    "Movimiento nacional.",
    "Autoliquidación del Impuesto Especial.",
    "Operación no atribuible al receptor declarado.",
  ],
  preparation: [
    "Confirmar registro y establecimiento receptor.",
    "Conciliar cada recepción con EMCS.",
    "Clasificar producto, epígrafe y cantidad.",
    "Cruzar con contabilidad y autoliquidaciones.",
  ],
  correction:
    "Corrige el registro y el periodo por el cauce oficial, manteniendo la referencia EMCS; una incidencia de recepción no debe ocultarse con un alta duplicada.",
  procedureSourceId: "aeat.model-510.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-510.procedure-record.2026-06-09",
  additionalOfficialLinks: [
    {
      label: "Aviso oficial para destinatarios",
      sourceId: "aeat.model-510.recipient-warning.pdf",
    },
  ],
  legalSourceIds: ["boe.excise-models.order-eha-3482-2007.original"],
  related: [
    {
      code: "504",
      href: "/consultor-fiscal/modelos/504",
      description: "Solicitud de autorización de determinados movimientos.",
    },
    {
      code: "505",
      href: "/consultor-fiscal/modelos/505",
      description: "Autorización administrativa del movimiento.",
    },
    {
      code: "512",
      href: "/consultor-fiscal/modelos/512",
      description: "Relación anual de ciertos destinatarios de hidrocarburos.",
    },
    {
      code: "349",
      href: "/consultor-fiscal/modelos/349",
      description: "Declaración de IVA de operaciones intracomunitarias.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta por cualquier compra de la UE?",
      answer:
        "No. Solo por recepciones de productos sujetos y para los operadores comprendidos en el procedimiento.",
    },
    {
      question: "¿Es mensual o trimestral?",
      answer:
        "Depende del operador y periodo aplicable; la ficha no fuerza una periodicidad única sin comprobar el caso.",
    },
  ],
});

export const MODEL_512_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "512",
  category: "Impuesto sobre Hidrocarburos · Tarifa segunda",
  statusLabel: "Relación anual · 50.000 litros",
  statusTone: "current",
  intro: [
    "El Modelo 512 es la relación anual de destinatarios de determinados productos sensibles de la tarifa segunda del Impuesto sobre Hidrocarburos.",
    "Lo presenta el establecimiento expedidor, no el destinatario, y solo cuando algún destinatario alcanza el umbral legal de 50.000 litros.",
  ],
  notices: [
    {
      title: "Una declaración por establecimiento",
      paragraphs: [
        "El cómputo es anual por destinatario y establecimiento. Si nadie alcanza 50.000 litros, no se presenta por este solo motivo.",
      ],
    },
  ],
  type: "Relación anual informativa de destinatarios.",
  presenter:
    "Titular de fábrica, depósito fiscal o almacén fiscal expedidor de los productos afectados.",
  nonPresenter:
    "El destinatario que recibe el producto o un expedidor sin destinatarios que alcancen el umbral.",
  periodicity: "Anual, por establecimiento.",
  deadline: "Durante el primer trimestre del año siguiente.",
  channel: "Presentación telemática de la relación por establecimiento.",
  result:
    "Información de control; no genera por sí misma ingreso ni devolución.",
  included: [
    "Destinatario, NIF, dirección y CAE cuando proceda.",
    "Producto de tarifa segunda y cantidad anual.",
    "Umbral de 50.000 litros por destinatario.",
    "Establecimiento expedidor y ejercicio.",
  ],
  excluded: [
    "Declaración del destinatario.",
    "Expediciones por debajo del umbral en todos los destinatarios.",
    "Cualquier hidrocarburo fuera del alcance.",
    "Autoliquidación del Modelo 581.",
  ],
  preparation: [
    "Separar cada establecimiento.",
    "Agrupar litros por destinatario y producto.",
    "Validar NIF, dirección y CAE.",
    "Conciliar con SILICIE y documentos de salida.",
  ],
  correction:
    "Corrige la relación del establecimiento y ejercicio afectados, conservando el detalle que justifica el cómputo del umbral.",
  procedureSourceId: "aeat.model-512.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-512.procedure-record.2026-06-09",
  document: {
    label: "Formulario oficial del Modelo 512",
    sourceId: "aeat.model-512.official-form.pdf",
  },
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales del Modelo 512",
      sourceId: "aeat.model-512.instructions.pdf",
    },
  ],
  legalSourceIds: ["boe.excise-models.order-eha-3482-2007.original"],
  related: [
    {
      code: "510",
      href: "/consultor-fiscal/modelos/510",
      description: "Declaración de determinadas recepciones desde la UE.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación del Impuesto sobre Hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se calcula por destinatario?",
      answer:
        "Sí. Se agregan las cantidades anuales de cada destinatario para aplicar el umbral de 50.000 litros.",
    },
    {
      question: "¿Se presenta si nadie supera el límite?",
      answer:
        "No por esta obligación. La norma dispensa la relación cuando ningún destinatario alcanza el umbral.",
    },
  ],
});
