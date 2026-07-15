import { createBatch3PracticalGuideV1 } from "./create-batch-3-practical-guide.v1";

export const MODEL_515_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "515",
  category: "Impuestos Especiales · Marcas fiscales de tabaco",
  statusLabel: "Solicitud electrónica · Todas las labores del tabaco",
  statusTone: "current",
  effectiveYear: 2026,
  intro: [
    "El Modelo 515 es la solicitud electrónica de entrega de marcas fiscales para las labores del tabaco por operadores y establecimientos autorizados.",
    "Desde la regulación vigente de 2024 abarca todas las labores del tabaco sujetas al sistema de marcas y exige autorización, recepción y contabilidad posteriores.",
  ],
  notices: [
    {
      title: "No es una solicitud de un estanco por su compra ordinaria",
      paragraphs: [
        "Solo pueden solicitar marcas los operadores comprendidos y registrados. Las numeraciones, recepción, utilización, deterioro, destrucción y devolución deben quedar controladas.",
      ],
    },
  ],
  type: "Solicitud electrónica de marcas fiscales de tabaco.",
  presenter:
    "Fábrica, depósito fiscal, importador u otro operador autorizado de labores del tabaco.",
  nonPresenter:
    "Estanco, comercio o consumidor por comprar o vender tabaco en la actividad ordinaria.",
  periodicity: "Por solicitud de marcas necesaria para el establecimiento.",
  deadline:
    "Antes de necesitarlas para la circulación o comercialización, respetando autorización, existencias y control de numeración.",
  channel:
    "Solicitud electrónica actual, seguida de comunicaciones de recepción y contabilidad.",
  result:
    "Puede dar lugar a autorización y entrega de marcas; la solicitud no garantiza cantidad ni formato.",
  included: [
    "CAE, establecimiento y condición del operador.",
    "Todas las labores del tabaco comprendidas por la regulación vigente.",
    "Tipo, formato, cantidad y numeración de marcas.",
    "Recepción, uso, existencias, pérdidas, destrucción y devolución.",
  ],
  excluded: [
    "Marcas fiscales de bebidas derivadas del Modelo 517.",
    "Sellos comerciales o etiquetado privado.",
    "Solicitud ordinaria de un estanco.",
    "Uso de formularios históricos en papel como canal actual.",
  ],
  preparation: [
    "Confirmar autorización y CAE del establecimiento.",
    "Determinar labor, formato y cantidad.",
    "Conciliar existencias y numeraciones anteriores.",
    "Preparar comunicaciones posteriores de recepción y uso.",
  ],
  correction:
    "Corrige la solicitud antes de su ejecución o comunica la incidencia por el canal oficial; no elimines de la contabilidad marcas perdidas o dañadas.",
  procedureSourceId: "aeat.model-515.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-515.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-515.marks-information.2024-04-11",
  document: {
    label: "Guía oficial de precintas de tabaco",
    sourceId: "aeat.model-515.precinct-guide.pdf",
  },
  legalSourceIds: ["boe.model-515.order-hac-66-2024.original"],
  related: [
    {
      code: "566",
      href: "/consultor-fiscal/modelos/566",
      description: "Autoliquidación de labores del tabaco.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta un estanco?",
      answer:
        "No por su compra o venta minorista ordinaria. Lo solicitan operadores y establecimientos autorizados.",
    },
    {
      question: "¿Para qué productos se utiliza?",
      answer:
        "La regulación vigente de 2024 extiende el sistema a todas las labores del tabaco comprendidas.",
    },
  ],
});

export const MODEL_517_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "517",
  category: "Impuestos Especiales · Marcas fiscales de bebidas",
  statusLabel: "Solicitud electrónica · Bebidas derivadas",
  statusTone: "current",
  intro: [
    "El Modelo 517 solicita marcas fiscales del Impuesto sobre el Alcohol y Bebidas Derivadas.",
    "Tiene su propio sistema de entrega, información posterior y control de precintas, distinto del Modelo 515 de tabaco.",
  ],
  notices: [
    {
      title: "Precintas de bebidas, no marcas de tabaco",
      paragraphs: [
        "La solicitud corresponde a establecimientos autorizados. Deben controlarse cajas, numeración, recepción, existencias, uso, deterioro y destrucción.",
      ],
    },
  ],
  type: "Solicitud electrónica de marcas fiscales de bebidas derivadas.",
  presenter:
    "Fábrica, depósito fiscal, importador u otro operador autorizado de alcohol y bebidas derivadas.",
  nonPresenter:
    "Bar, restaurante, tienda o consumidor por adquirir o vender bebidas de forma ordinaria.",
  periodicity: "Por solicitud de marcas necesaria para el establecimiento.",
  deadline:
    "Antes de utilizar las marcas, respetando autorización, existencias y comunicaciones posteriores.",
  channel:
    "Solicitud electrónica y posteriores comunicaciones de entrega, recepción y control.",
  result:
    "Puede generar autorización y entrega de precintas; no garantiza la aceptación de la cantidad solicitada.",
  included: [
    "Solicitante, establecimiento y CAE.",
    "Bebidas derivadas, envases y formato de marca.",
    "Cantidad, cajas, numeración y entrega.",
    "Recepción, uso, existencias, pérdidas, roturas y destrucción.",
  ],
  excluded: [
    "Marcas de tabaco del Modelo 515.",
    "Venta ordinaria en hostelería.",
    "Autoliquidación del Modelo 563.",
    "Formulario histórico en papel como canal actual.",
  ],
  preparation: [
    "Confirmar autorización y CAE.",
    "Determinar formato, envases y cantidad.",
    "Conciliar cajas y numeraciones existentes.",
    "Preparar comunicaciones posteriores de recepción y uso.",
  ],
  correction:
    "Corrige o comunica la incidencia por el canal oficial y conserva la trazabilidad de cada numeración; no ajustes existencias sin soporte.",
  procedureSourceId: "aeat.model-517.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-517.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-517.marks-information.2025-11-05",
  document: {
    label: "Guía oficial de precintas de bebidas derivadas",
    sourceId: "aeat.model-517.precinct-guide.pdf",
  },
  additionalOfficialLinks: [
    {
      label: "Información oficial sobre cajas de precintas",
      sourceId: "aeat.model-517.box-information.pdf",
    },
  ],
  legalSourceIds: [
    "boe.model-517.order-hac-1271-2019.original",
    "boe.model-517.order-hac-626-2020.original",
  ],
  related: [
    {
      code: "518",
      href: "/consultor-fiscal/modelos/518",
      description: "Declaración previa de operaciones de trabajo.",
    },
    {
      code: "519",
      href: "/consultor-fiscal/modelos/519",
      description: "Parte inmediato de incidencias.",
    },
    {
      code: "520",
      href: "/consultor-fiscal/modelos/520",
      description: "Parte final de resultados.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description:
        "Autoliquidación del impuesto sobre alcohol y bebidas derivadas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta un bar o restaurante?",
      answer:
        "No por vender bebidas. Se reserva a operadores y establecimientos autorizados que reciben y controlan las marcas.",
    },
    {
      question: "¿Qué ocurre con precintas dañadas?",
      answer:
        "Deben conservarse y comunicarse según el procedimiento de control; no se eliminan sin dejar trazabilidad.",
    },
  ],
});

export const MODEL_518_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "518",
  category: "Alcohol · Operaciones de trabajo",
  statusLabel: "Comunicación previa · Un día hábil",
  statusTone: "current",
  intro: [
    "El Modelo 518 es la declaración previa de determinadas operaciones de trabajo en establecimientos del Impuesto sobre el Alcohol y Bebidas Derivadas.",
    "No liquida el impuesto: anticipa la operación y abre la secuencia que, si hay incidencias, continúa con el 519 y termina con el resultado 520.",
  ],
  notices: [
    {
      title: "Al menos un día hábil antes",
      paragraphs: [
        "La declaración debe transmitirse con una antelación mínima de un día hábil respecto del comienzo de la operación.",
      ],
    },
  ],
  type: "Declaración previa de operación de trabajo.",
  presenter:
    "Titular de un establecimiento autorizado que va a realizar la operación de trabajo comprendida.",
  nonPresenter:
    "Un comercio de bebidas, un consumidor o un establecimiento sin la operación y autorización exigidas.",
  periodicity: "Por operación o periodo de actividad declarado.",
  deadline:
    "Con una antelación de al menos un día hábil antes del comienzo de la operación.",
  channel: "Presentación electrónica previa al inicio.",
  result:
    "Comunicación de la previsión de trabajo; no genera pago ni autoriza por sí sola un establecimiento.",
  included: [
    "Establecimiento, CAE, fecha y hora de inicio.",
    "Producto inicial, cantidad y grado alcohólico.",
    "Proceso, equipos, depósitos y duración prevista.",
    "Producto y rendimiento esperados.",
  ],
  excluded: [
    "Parte de incidencias 519.",
    "Resultado final 520.",
    "Autoliquidación del impuesto.",
    "Operación ya iniciada sin respetar la antelación.",
  ],
  preparation: [
    "Definir producto, cantidad, proceso y equipos.",
    "Fijar inicio y final previstos.",
    "Conciliar depósitos y contabilidad/SILICIE.",
    "Preparar la referencia para 519 y 520.",
  ],
  correction:
    "Antes del inicio, modifica o anula por el cauce oficial; si la operación ya comenzó, comunica la incidencia mediante el 519 cuando corresponda.",
  procedureSourceId: "aeat.model-518.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-518.procedure-record.2026-06-09",
  document: {
    label: "Formulario oficial del Modelo 518",
    sourceId: "aeat.model-518.official-form.pdf",
  },
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales del Modelo 518",
      sourceId: "aeat.model-518.official-instructions.pdf",
    },
  ],
  legalSourceIds: ["boe.models-518-520.resolution-20-january-1998.original"],
  related: [
    {
      code: "519",
      href: "/consultor-fiscal/modelos/519",
      description: "Comunicación inmediata de una incidencia.",
    },
    {
      code: "520",
      href: "/consultor-fiscal/modelos/520",
      description: "Resultado final de la operación.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description: "Autoliquidación del impuesto.",
    },
  ],
  specificFaq: [
    {
      question: "¿Es una autoliquidación?",
      answer: "No. Es una comunicación previa de la operación de trabajo.",
    },
    {
      question: "¿Qué ocurre si cambia la operación?",
      answer:
        "Si aún no empezó, modifica o anula la declaración; si ya está en curso, utiliza el parte de incidencias 519 cuando proceda.",
    },
  ],
});

export const MODEL_519_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "519",
  category: "Alcohol · Operaciones de trabajo",
  statusLabel: "Incidencia · Comunicación inmediata",
  statusTone: "current",
  intro: [
    "El Modelo 519 comunica las incidencias ocurridas durante una operación de trabajo de alcohol previamente declarada mediante el Modelo 518.",
    "Solo se utiliza cuando existe una incidencia y debe transmitirse inmediatamente; no sustituye el resultado final del Modelo 520.",
  ],
  notices: [
    {
      title: "Inmediatamente al producirse la incidencia",
      paragraphs: [
        "Averías, interrupciones, pérdidas o cambios relevantes deben vincularse a la declaración de trabajo y comunicarse sin esperar al cierre de la operación.",
      ],
    },
  ],
  type: "Parte inmediato de incidencias.",
  presenter:
    "Titular del establecimiento que declaró el trabajo mediante el 518 y sufre una incidencia comunicable.",
  nonPresenter:
    "Quien no tiene una operación 518 relacionada o quien solo debe comunicar el resultado normal final.",
  periodicity: "Solo cuando se produce una incidencia.",
  deadline: "Con carácter inmediato a la producción de la incidencia.",
  channel: "Presentación electrónica vinculada a la referencia del 518.",
  result:
    "Deja constancia operativa de la incidencia; no liquida el impuesto ni cierra el trabajo.",
  included: [
    "Referencia 518, establecimiento y CAE.",
    "Fecha, hora y tipo de incidencia.",
    "Avería, interrupción, pérdida, derrame o cambio relevante.",
    "Medidas adoptadas y reanudación.",
  ],
  excluded: [
    "Declaración previa 518.",
    "Resultado final 520.",
    "Autoliquidación del impuesto.",
    "Parte sin una incidencia real.",
  ],
  preparation: [
    "Recuperar la referencia exacta del 518.",
    "Registrar fecha y hora de la incidencia.",
    "Describir cantidades y medidas adoptadas.",
    "Conciliar con SILICIE y documentación interna.",
  ],
  correction:
    "Corrige por el procedimiento oficial sin borrar la incidencia original; conserva la relación con el 518 y el futuro 520.",
  procedureSourceId: "aeat.model-519.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-519.procedure-record.2026-06-09",
  legalSourceIds: ["boe.models-518-520.resolution-20-january-1998.original"],
  related: [
    {
      code: "518",
      href: "/consultor-fiscal/modelos/518",
      description: "Declaración previa de la operación.",
    },
    {
      code: "520",
      href: "/consultor-fiscal/modelos/520",
      description: "Parte de resultado que cierra el periodo de actividad.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta siempre?",
      answer: "No. Solo cuando se produce una incidencia comunicable.",
    },
    {
      question: "¿Sustituye al Modelo 520?",
      answer:
        "No. El 519 registra la incidencia y el 520 comunica el resultado final de la operación.",
    },
  ],
});

export const MODEL_520_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "520",
  category: "Alcohol · Operaciones de trabajo",
  statusLabel: "Resultado final · Día de finalización",
  statusTone: "current",
  intro: [
    "El Modelo 520 comunica el resultado final de una operación de trabajo previamente declarada mediante el Modelo 518.",
    "Debe recoger las incidencias 519, las cantidades realmente utilizadas y obtenidas y las diferencias frente a la previsión.",
  ],
  notices: [
    {
      title: "El día en que finaliza el periodo de actividad",
      paragraphs: [
        "Se presenta el día de finalización indicado en la declaración de trabajo y, en su caso, ajustado por el parte de incidencias.",
      ],
    },
  ],
  type: "Parte final de resultados de una operación de trabajo.",
  presenter:
    "Titular del establecimiento que debe cerrar la operación declarada mediante el 518.",
  nonPresenter:
    "Quien no tiene una operación relacionada o quien pretende usarlo como autoliquidación.",
  periodicity: "Por finalización de cada periodo de actividad declarado.",
  deadline: "El día en que finaliza el periodo de actividad.",
  channel: "Presentación electrónica vinculada al 518 y a los 519 existentes.",
  result:
    "Cierra documentalmente la operación de trabajo; no sustituye la autoliquidación del impuesto.",
  included: [
    "Referencia 518 e incidencias 519.",
    "Producto y cantidad inicial utilizados.",
    "Producto, cantidad y grado finalmente obtenidos.",
    "Mermas, pérdidas, subproductos y depósitos de destino.",
  ],
  excluded: [
    "Declaración previa 518.",
    "Parte inmediato de incidencias 519.",
    "Autoliquidación del Modelo 563.",
    "Resultado previsto que no coincide con el real.",
  ],
  preparation: [
    "Conciliar cantidades iniciales y finales.",
    "Incorporar incidencias, mermas y pérdidas.",
    "Verificar fecha y hora de cierre.",
    "Cuadrar con depósitos y SILICIE.",
  ],
  correction:
    "Rectifica el parte por el cauce oficial conservando la operación original y la cadena 518–519–520; documenta cualquier diferencia de rendimiento.",
  procedureSourceId: "aeat.model-520.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-520.procedure-record.2026-06-09",
  legalSourceIds: ["boe.models-518-520.resolution-20-january-1998.original"],
  related: [
    {
      code: "518",
      href: "/consultor-fiscal/modelos/518",
      description: "Declaración previa de la operación.",
    },
    {
      code: "519",
      href: "/consultor-fiscal/modelos/519",
      description: "Incidencias ocurridas durante el trabajo.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description: "Autoliquidación del impuesto sobre alcohol.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué ocurre si hay mermas?",
      answer:
        "Deben reflejarse y justificarse junto con cantidades, pérdidas e incidencias; no se ocultan ajustando el resultado esperado.",
    },
    {
      question: "¿Debe coincidir con SILICIE?",
      answer:
        "Debe conciliarse con la contabilidad reglamentaria y los movimientos registrados, explicando cualquier diferencia.",
    },
  ],
});

export const MODEL_521_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "521",
  category: "Alcohol vínico · Materias primas",
  statusLabel: "Relación trimestral · Artículo 89.4 y 89.5",
  statusTone: "current",
  intro: [
    "El Modelo 521 es la relación trimestral de primeras materias entregadas prevista en los artículos 89.4 y 89.5 del Reglamento de los Impuestos Especiales.",
    "Afecta a materias primas para alcohol vínico y a determinadas salidas de azúcares, isoglucosa y melazas; no es una relación general de compras.",
  ],
  notices: [
    {
      title: "Solo cuando hubo entregas o envíos",
      paragraphs: [
        "Quienes almacenan materias primas para alcohol vínico incluyen las entregas a destilación o rectificación; orujos, piquetas y residuos de vinificación se relacionan cualquiera que sea su destino.",
      ],
    },
  ],
  type: "Relación trimestral informativa de materias primas.",
  presenter:
    "Almacenista de materias primas para alcohol vínico y, en sus supuestos, fabricante de azúcares o isoglucosa y almacenista de melazas.",
  nonPresenter:
    "Cualquier comprador de materias primas o un operador sin entregas de los productos específicamente incluidos.",
  periodicity: "Trimestral, solo si hubo entregas o envíos.",
  deadline:
    "Durante los veinte primeros días siguientes a cada trimestre natural.",
  channel: "Formulario electrónico con resumen por destinatarios y productos.",
  result: "Información de control; no genera ingreso ni devolución.",
  included: [
    "Materias primas para fabricación de alcohol vínico.",
    "Orujos, piquetas y demás residuos de vinificación.",
    "Melaza, isoglucosa y azúcares en los supuestos reglamentarios.",
    "Destinatario, fecha, producto, cantidad y graduación.",
  ],
  excluded: [
    "Cualquier materia prima industrial.",
    "Relación negativa sin entregas.",
    "Parte de biocarburantes del Modelo 522.",
    "Autoliquidación del impuesto sobre alcohol.",
  ],
  preparation: [
    "Clasificar productos conforme al artículo 89.",
    "Agrupar por destinatario y trimestre.",
    "Validar NIF, CAE, cantidad y graduación.",
    "Conciliar salidas con la contabilidad del establecimiento.",
  ],
  correction:
    "Actualiza o sustituye la relación por el cauce oficial y conserva el detalle por destinatario; no presentes una relación negativa si hubo entregas.",
  procedureSourceId: "aeat.model-521.procedure-home.2026-03-09",
  recordSourceId: "aeat.model-521.procedure-record.2026-06-09",
  legalSourceIds: ["boe.model-521.order-eha-2770-2010.original"],
  related: [
    {
      code: "522",
      href: "/consultor-fiscal/modelos/522",
      description:
        "Parte trimestral de productos del antiguo artículo 108 ter.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description:
        "Autoliquidación del impuesto sobre alcohol y bebidas derivadas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué primeras materias incluye?",
      answer:
        "Materias para alcohol vínico, incluidos orujos, piquetas y residuos, y determinadas salidas de azúcares, isoglucosa y melazas.",
    },
    {
      question: "¿Se presenta sin operaciones?",
      answer:
        "No. La orden dispensa la relación cuando no hubo entregas o envíos en el trimestre.",
    },
  ],
});

export const MODEL_522_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "522",
  category: "Hidrocarburos · Biocarburantes",
  statusLabel: "Vigencia normativa conflictiva · Consulta obligatoria",
  statusTone: "auxiliary",
  intro: [
    "El Modelo 522 nació como parte trimestral de los primeros proveedores de productos de los apartados f) y g) del artículo 46.1 de la Ley de Impuestos Especiales destinados a fábricas o depósitos fiscales.",
    "La AEAT conserva en 2026 formulario y consulta, pero el artículo 108 ter que fundamentaba la obligación fue derogado en 2013; por ello esta ficha no afirma una obligación actual ni recomienda presentar sin confirmación oficial.",
  ],
  notices: [
    {
      title: "Conflicto oficial no resuelto silenciosamente",
      paragraphs: [
        "La página de la AEAT está actualizada y ofrece canales, mientras el BOE consolidado marca derogado el artículo 108 ter. Debe confirmarse la situación con la oficina gestora antes de actuar.",
      ],
    },
  ],
  type: "Parte trimestral histórico con canal AEAT aún visible.",
  presenter:
    "Históricamente, primer proveedor de bioetanol, biometanol, aceites vegetales o productos afines del artículo 46.1 f) y g) a fábrica o depósito fiscal.",
  nonPresenter:
    "Cualquier operador de combustible, destinatario final o proveedor sin la primera introducción descrita.",
  periodicity:
    "Históricamente trimestral y solo con movimientos; no se publica como obligación vigente sin confirmación.",
  deadline:
    "La resolución original fijaba los veinte primeros días tras el trimestre; no debe aplicarse hoy sin confirmar vigencia.",
  channel:
    "La AEAT mantiene formulario e importación de fichero, pero deben usarse solo después de confirmar el fundamento normativo actual.",
  result:
    "Parte informativo sin pago; la ficha permanece bloqueada para una recomendación de presentación actual.",
  included: [
    "Históricamente, primeros proveedores a fábrica o depósito fiscal.",
    "Bioetanol, biometanol, aceites vegetales y productos derivados definidos por la norma.",
    "Destinatario, CAE, producto, cantidad y unidad.",
    "Solo trimestres con movimientos en la regulación original.",
  ],
  excluded: [
    "Cualquier operador de hidrocarburos.",
    "Parte sin movimientos.",
    "Obligación actual inferida solo porque el formulario siga visible.",
    "Autoliquidación del Impuesto sobre Hidrocarburos.",
  ],
  preparation: [
    "Confirmar por escrito la vigencia con la oficina gestora.",
    "Identificar producto y artículo legal aplicable hoy.",
    "Conservar referencias de la página AEAT y BOE consolidado.",
    "No enviar ni omitir basándose solo en esta ficha.",
  ],
  correction:
    "Para periodos históricos, utiliza el cauce de consulta o corrección; para un periodo actual, pide confirmación oficial antes de enviar.",
  procedureSourceId: "aeat.model-522.procedure-home.2026-03-09",
  recordSourceId: "aeat.model-522.procedure-record.2026-06-09",
  legalSourceIds: ["boe.model-522.resolution-2010-07-01.original"],
  allowProcedureAction: false,
  readOnlyActionLabel: "Consultar el estado oficial del Modelo 522",
  related: [
    {
      code: "521",
      href: "/consultor-fiscal/modelos/521",
      description:
        "Relación trimestral vigente de materias primas para alcohol vínico.",
    },
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación del Impuesto sobre Hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué producto controlaba?",
      answer:
        "Productos del artículo 46.1 f) y g), como bioetanol, biometanol y determinados aceites vegetales o derivados destinados a combustible o carburante.",
    },
    {
      question: "¿Está vigente el artículo 108 ter?",
      answer:
        "No. El BOE consolidado lo marca derogado desde 2013, aunque la AEAT mantiene un formulario visible; por eso debe confirmarse antes de actuar.",
    },
  ],
});

export const MODEL_523_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "523",
  category: "Alcohol · Beneficios de devolución",
  statusLabel: "Reconocimiento previo del beneficio",
  statusTone: "current",
  intro: [
    "El Modelo 523 es el procedimiento previo para aplicar determinados beneficios de devolución de los Impuestos Especiales sobre alcohol y bebidas alcohólicas.",
    "La ficha administrativa lo vincula al reconocimiento del derecho para fabricación de aromas, alimentos rellenos y productos no alcohólicos en los supuestos admitidos.",
  ],
  notices: [
    {
      title: "Reconocimiento previo, no devolución periódica",
      paragraphs: [
        "El 523 acredita el derecho y las condiciones del beneficiario. La solicitud periódica de cuotas soportadas se realiza, cuando procede, mediante el Modelo 524.",
      ],
    },
  ],
  type: "Solicitud o comunicación de reconocimiento de beneficio.",
  presenter:
    "Fabricante o usuario profesional que solicita el reconocimiento para un uso de alcohol expresamente admitido.",
  nonPresenter:
    "Cualquier comprador de alcohol, consumidor o actividad no incluida en los supuestos de devolución.",
  periodicity:
    "Antes de aplicar el beneficio y cuando cambian datos relevantes.",
  deadline:
    "Antes de utilizar el beneficio en las operaciones que lo exigen; no se presume retroactivamente.",
  channel: "Solicitud o comunicación electrónica ante la oficina gestora.",
  result:
    "Reconocimiento, requerimiento o denegación del derecho; no abona por sí mismo una cuota.",
  included: [
    "Fabricación de aromas en los supuestos oficiales.",
    "Alimentos rellenos y productos no alcohólicos admitidos.",
    "Actividad, establecimiento, CAE y productos.",
    "Contabilidad, proveedores y cantidades previstas.",
  ],
  excluded: [
    "Compra ordinaria de alcohol.",
    "Solicitud periódica de devolución del Modelo 524.",
    "Uso no reconocido por la norma.",
    "Exención o devolución automática.",
  ],
  preparation: [
    "Describir actividad, proceso y productos finales.",
    "Identificar establecimiento, CAE y proveedores.",
    "Preparar contabilidad y cantidades previstas.",
    "Conservar la resolución para futuras solicitudes 524.",
  ],
  correction:
    "Comunica cambios de actividad, establecimiento o productos antes de aplicarlos y subsana el expediente por el canal oficial.",
  procedureSourceId: "aeat.model-523.procedure-home.2026-03-25",
  recordSourceId: "aeat.model-523.procedure-record.2026-03-25",
  legalSourceIds: [
    "boe.model-523.resolution-1996-07-09.original",
    "boe.model-523.resolution-2005-06-10.original",
  ],
  related: [
    {
      code: "524",
      href: "/consultor-fiscal/modelos/524",
      description:
        "Solicitud periódica de devolución de las cuotas soportadas.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description:
        "Autoliquidación del impuesto sobre alcohol y bebidas derivadas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Es la solicitud trimestral de devolución?",
      answer:
        "No. El 523 reconoce previamente el beneficio; el 524 solicita después la devolución de cuotas en los periodos correspondientes.",
    },
    {
      question: "¿Qué usos menciona la AEAT?",
      answer:
        "Entre otros supuestos descritos, fabricación de aromas, alimentos rellenos y productos no alcohólicos.",
    },
  ],
});

export const MODEL_524_GUIDE_V1 = createBatch3PracticalGuideV1({
  code: "524",
  category: "Alcohol · Devoluciones",
  statusLabel: "Solicitud trimestral de devolución",
  statusTone: "current",
  intro: [
    "El Modelo 524 solicita la devolución de cuotas de los Impuestos Especiales soportadas por alcohol o bebidas alcohólicas utilizados en determinados procesos y usos admitidos.",
    "No devuelve cualquier compra de alcohol y puede exigir el reconocimiento previo del beneficio mediante el Modelo 523.",
  ],
  notices: [
    {
      title: "Uso acreditado y cuota soportada",
      paragraphs: [
        "Deben conciliarse producto, grado, cantidad, proveedor, documento de circulación, contabilidad y destino efectivo. La solicitud no garantiza la devolución.",
      ],
    },
  ],
  type: "Solicitud trimestral de devolución sobre alcohol.",
  presenter:
    "Beneficiario autorizado que utiliza alcohol o bebidas alcohólicas en un uso que genera derecho a devolución.",
  nonPresenter:
    "Cualquier comprador, consumidor o actividad sin reconocimiento y uso legalmente admitido.",
  periodicity: "Trimestral.",
  deadline:
    "Durante los veinte primeros días del mes siguiente al trimestre de utilización.",
  channel: "Presentación electrónica con relación de operaciones y documentos.",
  result:
    "Solicitud susceptible de devolución total o parcial, requerimiento o denegación.",
  included: [
    "Alcohol y bebidas alcohólicas con cuota soportada.",
    "Usos admitidos, como aromas, alimentos o productos no alcohólicos.",
    "Proveedor, factura, documento de circulación y CAE.",
    "Cantidad utilizada, grado y contabilidad.",
  ],
  excluded: [
    "Compra de alcohol sin uso admitido.",
    "Reconocimiento previo del Modelo 523.",
    "Cuota no acreditada o ya devuelta.",
    "Devolución automática por presentar el formulario.",
  ],
  preparation: [
    "Comprobar reconocimiento 523 cuando proceda.",
    "Conciliar facturas, circulación y contabilidad.",
    "Calcular cantidades efectivamente utilizadas.",
    "Evitar duplicidades entre periodos.",
  ],
  correction:
    "Subsanar la solicitud o rectificar el trimestre por operación, manteniendo la referencia de la cuota soportada y su uso efectivo.",
  procedureSourceId: "aeat.model-524.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-524.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-524.download-page.2026-06-09",
  document: {
    label: "Formulario oficial del Modelo 524",
    sourceId: "aeat.model-524.form-pdf.2026-07-13",
  },
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales del Modelo 524",
      sourceId: "aeat.model-524.instructions-pdf.2026-07-13",
    },
  ],
  legalSourceIds: [
    "boe.excise.order-eha-3482-2007.original",
    "boe.excise.order-eha-3363-2010.original",
  ],
  related: [
    {
      code: "523",
      href: "/consultor-fiscal/modelos/523",
      description: "Reconocimiento previo del beneficio de devolución.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description:
        "Autoliquidación del impuesto sobre alcohol y bebidas derivadas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Hace falta autorización previa?",
      answer:
        "En los supuestos que lo exigen, debe existir el reconocimiento del Modelo 523 antes de aplicar el beneficio.",
    },
    {
      question: "¿Cuándo paga Hacienda?",
      answer:
        "La presentación inicia la comprobación; el abono depende de la resolución y puede existir requerimiento o devolución parcial.",
    },
  ],
});
