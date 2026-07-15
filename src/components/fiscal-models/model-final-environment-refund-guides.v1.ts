import { createFinalPracticalGuideV1 } from "./create-final-practical-guide.v1";

const A22_HOME = "aeat.model-A22.procedure-home.2026-07-14";
const A22_RECORD = "aeat.model-A22.procedure-record.2026-07-14";
const A23_HOME = "aeat.model-A23.procedure-home.2026-07-14";
const A23_RECORD = "aeat.model-A23.procedure-record.2026-07-14";
const A24_HOME = "aeat.model-A24.procedure-home.2026-07-14";
const A24_RECORD = "aeat.model-A24.procedure-record.2026-07-14";

export const MODEL_A22_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "A22",
  category: "Devoluciones medioambientales",
  statusLabel: "Solicitud trimestral · impuesto sobre envases de plástico",
  intro: [
    "El Modelo A22 permite solicitar la devolución del impuesto especial sobre los envases de plástico no reutilizables en determinados supuestos acreditados por importadores y compradores posteriores que no son contribuyentes.",
    "No es la autoliquidación ordinaria del impuesto: fabricantes y adquirentes intracomunitarios utilizan el Modelo 592 y aplican en él sus propias deducciones o devoluciones cuando corresponda.",
  ],
  notices: [
    {
      title: "Soportar el impuesto no basta",
      paragraphs: [
        "La devolución exige encajar en uno de los supuestos del artículo 81 de la Ley 7/2022, acreditar el impuesto pagado y probar el destino, destrucción, devolución, modificación o uso que justifica la solicitud.",
        "La presentación no reconoce automáticamente el derecho y el mismo importe no puede recuperarse también mediante el Modelo 592 u otro procedimiento.",
      ],
    },
  ],
  declarationType: "Solicitud de devolución",
  presenter:
    "Importadores y adquirentes posteriores que no sean contribuyentes cuando cumplen uno de los supuestos tasados del artículo 81 de la Ley 7/2022; también puede actuar su representante autorizado.",
  nonPresenter:
    "No lo utiliza cualquier empresa que compre envases. Fabricantes y adquirentes intracomunitarios contribuyentes deben revisar las deducciones y devoluciones del Modelo 592.",
  periodicity:
    "Trimestral, agrupando las operaciones del trimestre natural correcto.",
  deadline:
    "Primeros veinte días naturales del mes siguiente al trimestre al que se refiere la solicitud.",
  channel:
    "Presentación electrónica en la sede de la AEAT, mediante formulario o importación de fichero, con consulta posterior de la solicitud y atención de requerimientos.",
  result:
    "Inicia una solicitud de devolución sujeta a comprobación. La AEAT puede pedir la prueba del impuesto y de todos los hechos que fundamentan el derecho.",
  included: [
    "Importaciones cuyos productos gravados se envían fuera del territorio de aplicación del impuesto.",
    "Productos importados destruidos o inadecuados antes de su primera entrega.",
    "Productos importados devueltos, tras su entrega, para destrucción o reincorporación al proceso, con reintegro del precio cuando lo exige la ley.",
    "Adquisiciones posteriores por no contribuyentes enviadas fuera del territorio de aplicación.",
    "Envases de medicamentos, productos sanitarios, alimentos para usos médicos especiales, preparados para lactantes de uso hospitalario y residuos peligrosos sanitarios, así como los elementos destinados a obtener, cerrar, comercializar o presentar esos envases.",
    "Productos inicialmente gravados como no reutilizables que, tras una modificación acreditada, pueden reutilizarse.",
    "Semielaborados y elementos de cierre, comercialización o presentación que finalmente no se destinan a fabricar o utilizar envases incluidos en el impuesto.",
  ],
  excluded: [
    "Deducciones de fabricantes o adquirentes intracomunitarios contribuyentes en el Modelo 592.",
    "Operaciones que no soportaron el impuesto o ya estaban exentas desde el origen.",
    "Salidas, destrucciones, destinos sanitarios o reutilización sin prueba suficiente.",
    "Devoluciones de ingresos indebidos por un error de pago, que tienen su propio procedimiento.",
    "IVA: el A22 solo se refiere al impuesto especial sobre envases de plástico.",
  ],
  preparation: [
    "Factura, documento de importación y justificante de la cuota efectivamente soportada.",
    "DUA, transporte, recepción y prueba de salida cuando el producto abandona el territorio.",
    "Acta de destrucción, certificado del gestor o prueba de inadecuación, según el supuesto.",
    "Nota de abono y prueba del reintegro del precio cuando el producto se devuelve.",
    "Certificación del destino sanitario exacto previsto en el artículo 81.1.e).",
    "Memoria técnica de la modificación y prueba de reutilización cuando esa sea la causa.",
    "Kilogramos de plástico no reciclado, operaciones, trimestre, cuenta bancaria y titularidad conciliados.",
  ],
  commonMistakes: [
    "Utilizar el A22 siendo fabricante o adquirente intracomunitario contribuyente.",
    "No demostrar el impuesto soportado, la salida, la destrucción o el destino declarado.",
    "Confundir una pérdida de valor con la destrucción o inadecuación legalmente acreditable.",
    "Omitir la devolución del precio cuando es requisito del supuesto.",
    "Duplicar el importe con una deducción o devolución del Modelo 592.",
    "Declarar kilos, trimestre o tipo de producto incorrectos, o solicitar IVA en vez del impuesto especial.",
  ],
  correction:
    "Consulta la solicitud y utiliza el cauce oficial de modificación, documentación complementaria o contestación a requerimientos. Si hubo un ingreso indebido, revisa ese procedimiento específico en lugar de forzar el A22.",
  procedureSourceId: A22_HOME,
  recordSourceId: A22_RECORD,
  legalLinks: [
    {
      label: "Ley 7/2022 · artículo 81 de devoluciones",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2022-5809#a81",
    },
    {
      label: "Orden HFP/1314/2022 · Modelos 592 y A22",
      sourceId: "boe.order-hfp-1314-2022.model-a22.2026-07-14",
    },
  ],
  related: [
    {
      code: "592",
      href: "/consultor-fiscal/modelos/592",
      description:
        "Autoliquidación del impuesto para fabricantes y adquirentes intracomunitarios, con sus propias reglas de deducción y devolución.",
    },
  ],
  specificFaq: [
    {
      question: "¿Quién puede presentar el A22?",
      answer:
        "Importadores y compradores posteriores que no sean contribuyentes, únicamente si cumplen y prueban uno de los supuestos del artículo 81 de la Ley 7/2022.",
    },
    {
      question: "¿Qué diferencia existe con el Modelo 592?",
      answer:
        "El 592 es la autoliquidación de fabricantes y adquirentes intracomunitarios; el A22 es una solicitud separada para importadores y determinados compradores no contribuyentes.",
    },
    {
      question: "¿Puede utilizarlo un fabricante?",
      answer:
        "No para trasladar al A22 una deducción propia: debe revisar el Modelo 592 y las reglas aplicables a su condición de contribuyente.",
    },
    {
      question: "¿Qué usos sanitarios contempla la ley vigente?",
      answer:
        "Medicamentos, productos sanitarios, alimentos para usos médicos especiales, preparados para lactantes de uso hospitalario y residuos peligrosos sanitarios, incluidos determinados elementos para obtener, cerrar, comercializar o presentar esos envases.",
    },
    {
      question: "¿Qué ocurre si los productos se destruyen?",
      answer:
        "La destrucción puede fundamentar la devolución en los supuestos legales, pero debe probarse y distinguirse de una simple pérdida de valor o merma.",
    },
    {
      question: "¿Puedo solicitarlo si convierto el envase en reutilizable?",
      answer:
        "El artículo 81 contempla al adquirente de productos inicialmente gravados como no reutilizables que acredita que, tras una modificación, pueden reutilizarse.",
    },
    {
      question: "¿La presentación garantiza la devolución?",
      answer:
        "No. La AEAT comprueba la legitimación, el pago del impuesto y la realidad del supuesto invocado.",
    },
  ],
  extraSections: [
    {
      id: "model-a22-refund-cases",
      title: "Mapa de supuestos del artículo 81",
      cards: [
        {
          title: "Importador",
          bullets: [
            "Envío fuera del territorio.",
            "Destrucción o inadecuación antes de la primera entrega.",
            "Devolución posterior para destrucción o reincorporación, con reintegro del precio cuando proceda.",
          ],
        },
        {
          title: "Comprador posterior no contribuyente",
          bullets: [
            "Envío fuera del territorio.",
            "Destino sanitario tasado.",
            "Conversión acreditada en reutilizable.",
            "Semielaborados o elementos que finalmente no se usan para el destino gravado.",
          ],
        },
      ],
      note: "Revisión de la Ley 7/2022 consolidada efectuada el 15 de julio de 2026.",
    },
  ],
  primaryActionLabel: "Abrir solicitud oficial A22",
  effectiveYear: 2023,
});

export const MODEL_A23_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "A23",
  category: "Devoluciones medioambientales",
  statusLabel: "Solicitud trimestral · impuesto sobre gases fluorados",
  intro: [
    "El Modelo A23 permite a determinados importadores y compradores posteriores que no son contribuyentes solicitar la devolución del impuesto sobre gases fluorados que soportaron.",
    "No es la autoliquidación ordinaria: los contribuyentes y almacenistas deben revisar el Modelo 587 y su contabilidad de existencias.",
  ],
  notices: [
    {
      title: "El destino exento vigente es muy concreto",
      paragraphs: [
        "La letra f) del artículo 5.Ocho.1 de la Ley 16/2013 se refiere, en la redacción consolidada revisada el 15 de julio de 2026, a gases destinados a incorporarse en buques o aeronaves que realicen navegación marítima o aérea internacional, excluida la privada de recreo.",
        "No utilices una categoría de una redacción antigua y no confundas este supuesto con la exención temporal de gases para inhaladores dosificadores.",
      ],
    },
  ],
  declarationType: "Solicitud de devolución",
  presenter:
    "Importadores que envían los gases fuera del territorio de aplicación y compradores posteriores no contribuyentes que acreditan esa salida o el destino exento del artículo 5.Ocho.1.f.",
  nonPresenter:
    "No lo utilizan fabricantes, adquirentes intracomunitarios contribuyentes o almacenistas para trasladar deducciones y regularizaciones que corresponden al Modelo 587.",
  periodicity:
    "Trimestral, referida al trimestre natural en que se produce el supuesto de devolución.",
  deadline: "Días 1 a 20 del mes siguiente al trimestre correspondiente.",
  channel:
    "Formulario electrónico de la sede de la AEAT, con consulta de solicitudes presentadas y aportación posterior de la documentación requerida.",
  result:
    "Inicia una solicitud sujeta a prueba y comprobación; no reconoce automáticamente la devolución ni sustituye la contabilidad o autoliquidación del impuesto.",
  included: [
    "Importador que acredita el envío de los gases fuera del territorio de aplicación del impuesto.",
    "Comprador posterior no contribuyente que acredita esa salida.",
    "Comprador posterior no contribuyente que acredita la incorporación de los gases a buques o aeronaves de navegación internacional, salvo navegación privada de recreo.",
    "Cuota efectivamente soportada, identificación del gas, kilogramos y potencial de calentamiento atmosférico conciliados.",
  ],
  excluded: [
    "Deducciones, compensaciones o saldos de contribuyentes y almacenistas en el Modelo 587.",
    "Envíos o destinos sin prueba suficiente, gases fuera del ámbito objetivo u operaciones sin impuesto soportado.",
    "Navegación privada de recreo, expresamente excluida del destino de la letra f).",
    "Devoluciones de ingresos indebidos por errores de pago y solicitudes duplicadas.",
    "El antiguo Modelo 586, limitado a operaciones realizadas hasta el 31 de agosto de 2022.",
  ],
  preparation: [
    "Factura, importación y justificante de la cuota soportada.",
    "Identificación técnica del gas, kilogramos y potencial de calentamiento atmosférico aplicable.",
    "Prueba de transporte, salida y recepción fuera del territorio cuando ese sea el supuesto.",
    "Declaración y prueba del destino en buque o aeronave de navegación internacional.",
    "Identificación que descarte la navegación privada de recreo.",
    "Trimestre, cuenta bancaria, titularidad y operaciones conciliadas con la documentación.",
  ],
  commonMistakes: [
    "Confundir la solicitud A23 con la autoliquidación 587.",
    "Aplicar una exención de una redacción anterior de la Ley 16/2013.",
    "Usar el supuesto de inhaladores como si fuera la letra f) vigente.",
    "No acreditar el impuesto, la salida o el destino de navegación internacional.",
    "Indicar un gas, peso o potencial de calentamiento atmosférico incorrectos.",
    "Duplicar la devolución o seleccionar un trimestre equivocado.",
  ],
  correction:
    "Consulta la solicitud y aporta o corrige la documentación por el cauce oficial. Si el ajuste corresponde a un contribuyente o almacenista, revisa el Modelo 587 y no dupliques el importe en A23.",
  procedureSourceId: A23_HOME,
  recordSourceId: A23_RECORD,
  legalLinks: [
    {
      label: "Ley 16/2013 consolidada · artículo 5.Ocho.1.f",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2013-11331#a5",
    },
    {
      label: "Orden HFP/826/2022 · Modelos 587 y A23",
      sourceId: "boe.order-hfp-826-2022.model-a23.2026-07-15",
    },
  ],
  related: [
    {
      code: "587",
      href: "/consultor-fiscal/modelos/587",
      description:
        "Autoliquidación vigente del impuesto sobre gases fluorados para contribuyentes y almacenistas.",
    },
    {
      code: "586",
      href: "/consultor-fiscal/modelos/586",
      description:
        "Autoliquidación histórica para operaciones realizadas hasta el 31 de agosto de 2022.",
    },
  ],
  specificFaq: [
    {
      question: "¿Quién puede presentar el A23?",
      answer:
        "Importadores y compradores posteriores no contribuyentes que acreditan el impuesto y uno de los supuestos de devolución vigentes.",
    },
    {
      question: "¿Qué diferencia existe con el 587?",
      answer:
        "El 587 es la autoliquidación de contribuyentes y almacenistas; el A23 es una solicitud trimestral separada para determinados importadores y compradores no contribuyentes.",
    },
    {
      question: "¿Qué destino exento permite la letra f) vigente?",
      answer:
        "La incorporación de los gases en buques o aeronaves que realicen navegación marítima o aérea internacional, excluida la privada de recreo.",
    },
    {
      question: "¿Incluye la navegación privada de recreo?",
      answer: "No. La ley la excluye expresamente.",
    },
    {
      question: "¿La exención de inhaladores es la misma regla?",
      answer:
        "No. Es un régimen distinto y temporal; no debe presentarse como el destino de la letra f) del artículo 5.Ocho.1.",
    },
    {
      question: "¿Qué es el PCA?",
      answer:
        "Es el potencial de calentamiento atmosférico del gas. Debe identificarse con la referencia técnica vigente y no estimarse de memoria.",
    },
    {
      question: "¿La solicitud garantiza la devolución?",
      answer:
        "No. La AEAT debe comprobar la legitimación, el pago y el destino o salida acreditados.",
    },
  ],
  extraSections: [
    {
      id: "model-a23-effective-rule",
      title: "Regla vigente revisable del destino exento",
      cards: [
        {
          title: "Incluido desde la redacción vigente en 2022",
          paragraphs: [
            "Gases destinados a incorporarse a buques o aeronaves de navegación marítima o aérea internacional.",
          ],
        },
        {
          title: "Excluido",
          paragraphs: [
            "Navegación privada de recreo. También quedan fuera otros usos que no coincidan exactamente con la letra f) vigente.",
          ],
        },
      ],
      note: "Ley 16/2013 consolidada comprobada el 15 de julio de 2026; esta regla debe revisarse si cambia el artículo 5.",
    },
  ],
  primaryActionLabel: "Abrir solicitud oficial A23",
  effectiveYear: 2022,
});

export const MODEL_A24_GUIDE_V1 = createFinalPracticalGuideV1({
  code: "A24",
  category: "Devoluciones de impuestos especiales",
  statusLabel: "Solicitud mensual · envíos de vapeo y nicotina a la UE",
  intro: [
    "El Modelo A24 permite solicitar la devolución del impuesto soportado en España por determinados líquidos para cigarrillos electrónicos y productos relacionados con el tabaco que se envían desde el territorio interno a otro Estado miembro de la Unión Europea.",
    "Es distinto de la autoliquidación mensual del Modelo 573 y del Modelo 590 utilizado para determinadas exportaciones y salidas a Canarias, Ceuta o Melilla.",
  ],
  notices: [
    {
      title: "Solo envíos intracomunitarios desde el 1 de abril de 2025",
      paragraphs: [
        "El A24 no se utiliza para ventas nacionales, exportaciones a países terceros ni salidas a Canarias, Ceuta o Melilla. Para estas últimas operaciones debe revisarse el Modelo 590.",
        "La solicitud exige identificar el producto, el impuesto soportado y la recepción en otro Estado miembro; una simple devolución comercial no acredita el derecho.",
      ],
    },
  ],
  declarationType: "Solicitud de devolución",
  presenter:
    "Quien soportó el impuesto en España y acredita el envío de los productos sujetos desde el territorio interno a otro Estado miembro de la Unión Europea.",
  nonPresenter:
    "No lo utiliza quien realiza una venta nacional, una exportación a un país tercero o una salida a Canarias, Ceuta o Melilla, ni quien no soportó el impuesto.",
  periodicity: "Mensual, por las operaciones realizadas en cada mes natural.",
  deadline:
    "Primeros veinte días naturales del mes siguiente al periodo mensual.",
  channel:
    "Formulario electrónico en la sede de la AEAT, con consulta de solicitudes y cauce para contestar requerimientos.",
  result:
    "Inicia una solicitud de devolución comprobable; no sustituye la autoliquidación 573 ni garantiza el abono sin prueba del impuesto y del envío intracomunitario.",
  included: [
    "Líquidos para cigarrillos electrónicos, bolsas de nicotina y otros productos incluidos en el nuevo impuesto cuando su envío intracomunitario genera el derecho.",
    "Operaciones realizadas desde la entrada en vigor del impuesto, el 1 de abril de 2025.",
    "Envío desde el territorio interno a otro Estado miembro y recepción acreditada.",
    "Producto, epígrafe, cantidad en mililitros o gramos, concentración cuando proceda y cuota soportada conciliados.",
  ],
  excluded: [
    "Autoliquidación ordinaria mensual, que corresponde al Modelo 573.",
    "Exportaciones a países terceros y salidas a Canarias, Ceuta o Melilla, para las que debe revisarse el Modelo 590.",
    "Operaciones anteriores al 1 de abril de 2025, ventas nacionales o productos no incluidos.",
    "Devoluciones comerciales sin prueba del envío y de la recepción intracomunitaria.",
    "Importes ya recuperados por otra vía o solicitudes duplicadas.",
  ],
  preparation: [
    "Factura y justificante de que el impuesto fue soportado en España.",
    "Identificación del producto, epígrafe, mililitros o gramos y concentración de nicotina cuando proceda.",
    "Documento de transporte y prueba de salida del territorio interno.",
    "Identificación del destinatario y prueba de recepción en el otro Estado miembro.",
    "Periodo mensual, operaciones y cuota solicitada conciliados con el Modelo 573.",
    "Cuenta bancaria, titularidad y documentos que exija el formulario vigente.",
  ],
  commonMistakes: [
    "Presentar A24 por una exportación, un envío nacional o una salida a Canarias, Ceuta o Melilla.",
    "Mezclar mililitros y gramos o seleccionar un epígrafe incorrecto.",
    "No acreditar el impuesto, el transporte o la recepción intracomunitaria.",
    "Incluir operaciones anteriores al 1 de abril de 2025.",
    "Presentar trimestralmente cuando la solicitud es mensual.",
    "Duplicar la devolución o confundir este impuesto especial con el IVA.",
  ],
  correction:
    "Consulta la solicitud y utiliza el cauce oficial de modificación o respuesta al requerimiento. Si la salida no fue a otro Estado miembro, revisa el Modelo 590 o el procedimiento que corresponda.",
  procedureSourceId: A24_HOME,
  recordSourceId: A24_RECORD,
  legalLinks: [
    {
      label: "Orden HAC/86/2025 · Modelos 573, A24 y 590",
      sourceId: "boe.order-hac-86-2025.model-a24.2026-07-15",
    },
  ],
  officialLinks: [
    {
      label: "Novedad AEAT sobre la devolución A24",
      href: "https://sede.agenciatributaria.gob.es/Sede/impuestos-especiales-medioambientales/novedades-impuestos-especiales-medioambientales/2025/abril/30/impuesto-sobre-liquidos-cigarrillos-electronicos-a24.html",
    },
  ],
  related: [
    {
      code: "573",
      href: "/consultor-fiscal/modelos/573",
      description:
        "Autoliquidación mensual del impuesto sobre líquidos para cigarrillos electrónicos y productos relacionados.",
    },
    {
      code: "590",
      href: "/consultor-fiscal/modelos/590",
      description:
        "Solicitud relacionada con exportaciones y determinadas salidas a Canarias, Ceuta o Melilla.",
    },
  ],
  specificFaq: [
    {
      question: "¿Desde cuándo existe este impuesto?",
      answer: "Es aplicable desde el 1 de abril de 2025.",
    },
    {
      question: "¿Para qué envíos se utiliza el A24?",
      answer:
        "Para envíos acreditados desde el territorio interno a otro Estado miembro de la Unión Europea de productos sujetos cuyo impuesto se soportó en España.",
    },
    {
      question: "¿Se utiliza para exportaciones?",
      answer:
        "No. Para países terceros y para determinadas salidas a Canarias, Ceuta o Melilla debe revisarse el Modelo 590.",
    },
    {
      question: "¿Qué productos incluye?",
      answer:
        "Los líquidos para cigarrillos electrónicos, bolsas de nicotina y otros productos relacionados incluidos legalmente, con su epígrafe y unidad correctos.",
    },
    {
      question: "¿Qué diferencia existe con el 573?",
      answer:
        "El 573 es la autoliquidación mensual ordinaria; el A24 es una solicitud de devolución por envíos a otro Estado miembro.",
    },
    {
      question: "¿Qué documentos prueban el envío?",
      answer:
        "Factura, documento de transporte, prueba de salida, identificación del destinatario y evidencia de recepción, además del justificante del impuesto.",
    },
    {
      question: "¿Puede incluirse una operación de marzo de 2025?",
      answer: "No. El impuesto empezó a aplicarse el 1 de abril de 2025.",
    },
    {
      question: "¿La solicitud garantiza la devolución?",
      answer:
        "No. La AEAT puede comprobar el producto, el impuesto soportado, la operación y la recepción intracomunitaria.",
    },
  ],
  extraSections: [
    {
      id: "model-a24-route-comparison",
      title: "Elige el cauce por el destino real",
      cards: [
        {
          title: "Otro Estado miembro de la UE",
          paragraphs: ["Modelo A24, con prueba de recepción intracomunitaria."],
        },
        {
          title: "País tercero, Canarias, Ceuta o Melilla",
          paragraphs: [
            "No uses A24: revisa el Modelo 590 y sus requisitos específicos.",
          ],
        },
      ],
      note: "La ubicación del destinatario y la prueba del movimiento determinan el cauce; no basta la etiqueta comercial de la operación.",
    },
  ],
  primaryActionLabel: "Abrir solicitud oficial A24",
  effectiveYear: 2025,
});
