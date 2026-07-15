import { createBatch4PracticalGuideV1 } from "./create-batch-4-practical-guide.v1";

const EXCISE_CATEGORY = "Impuestos Especiales · Fabricación y control";

export const MODEL_553_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "553",
  category: EXCISE_CATEGORY,
  statusLabel: "Vigente · Formulario separado desde 2025",
  statusTone: "current",
  transitionYear: 2025,
  intro: [
    "El Modelo 553 informa de movimientos, operaciones y existencias en determinadas fábricas y depósitos fiscales de vino y bebidas fermentadas.",
    "No es una autoliquidación y no lo presenta cualquier bodega: la AEAT separa los formularios de 2025 y siguientes de los ejercicios anteriores.",
  ],
  notices: [
    {
      title: "SILICIE y tipo cero",
      paragraphs: [
        "La declaración de operaciones no se exige, con carácter general, a titulares que llevan su contabilidad a través de la sede. Quien esté autorizado a libros en papel sí debe revisar el 553 trimestral; el tipo cero no borra las obligaciones de control.",
      ],
    },
  ],
  type: "Declaración de operaciones y existencias.",
  presenter:
    "Titular de fábrica o depósito fiscal de vino/bebidas fermentadas obligado a declarar operaciones, incluidos los supuestos autorizados de contabilidad en papel.",
  nonPresenter:
    "Cualquier bodega por producir vino, ni el establecimiento dispensado por llevar la contabilidad mediante suministro electrónico en sede, sin revisar su caso.",
  periodicity: "Trimestral cuando la declaración de operaciones es exigible.",
  deadline:
    "Primeros 20 días de enero, abril, julio y octubre respecto del trimestre anterior, conforme a la regla vigente.",
  channel:
    "Formulario electrónico diferenciado para 2025 y siguientes y para ejercicios anteriores.",
  result:
    "Información de movimientos y existencias; no genera una cuota a ingresar.",
  included: [
    "CAE, establecimiento y productos.",
    "Existencias iniciales y finales, entradas, producción, salidas, autoconsumos, mermas y pérdidas.",
    "Régimen suspensivo, unidades y graduación.",
  ],
  excluded: [
    "Autoliquidación del impuesto.",
    "Bodega no obligada por el solo hecho de producir.",
    "Duplicar en 553 lo dispensado por SILICIE sin comprobar la regla.",
  ],
  preparation: [
    "Confirmar CAE y forma de llevanza contable.",
    "Elegir flujo anterior a 2025 o 2025+.",
    "Conciliar movimientos y existencias.",
    "Separar productos, régimen y unidades.",
  ],
  correction:
    "Corrige la declaración en el flujo del ejercicio correspondiente y concilia el cambio con libros o SILICIE; no mezcles diseños anteriores y posteriores a 2025.",
  procedureSourceId: "aeat.model-553.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-553.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-553.silicie-wine-faq.2025-07-04",
  document: {
    label: "Formulario PDF oficial del Modelo 553",
    sourceId: "aeat.model-553.form-pdf.2026-07-13",
  },
  additionalOfficialLinks: [
    {
      label: "Preguntas SILICIE sobre otras bebidas fermentadas",
      sourceId: "aeat.model-553.silicie-fermented-faq.2025-07-04",
    },
  ],
  legalSourceIds: [
    "boe.excise.order-eha-3482-2007.original",
    "boe.silicie.order-hac-998-2019.original",
  ],
  related: [
    {
      code: "548",
      href: "/consultor-fiscal/modelos/548",
      description: "Cuotas repercutidas por depositarios autorizados.",
    },
    {
      code: "561",
      href: "/consultor-fiscal/modelos/561",
      description: "Autoliquidación de cerveza.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description: "Autoliquidación de alcohol y bebidas derivadas.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué cambia desde 2025?",
      answer:
        "La AEAT separa presentación y consulta de 2025 y siguientes de los ejercicios anteriores.",
    },
    {
      question: "¿Qué ocurre si llevo SILICIE en sede?",
      answer:
        "Con carácter general, la declaración de operaciones deja de ser exigible; revisa autorización, actividad y forma real de llevanza.",
    },
  ],
  extraSections: [
    {
      id: "model-553-transition",
      title: "Cambio de formulario y relación con SILICIE",
      cards: [
        {
          title: "2025 y siguientes",
          paragraphs: [
            "Utiliza el flujo específico publicado por la AEAT para esos ejercicios.",
          ],
        },
        {
          title: "Ejercicios anteriores",
          paragraphs: [
            "Consulta o corrige por el flujo histórico separado, sin reutilizar el diseño actual.",
          ],
        },
      ],
    },
  ],
});

export const MODEL_559_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "559",
  category: EXCISE_CATEGORY,
  statusLabel: "Destilación artesanal · Plazos especiales",
  statusTone: "current",
  intro: [
    "El Modelo 559 es la autoliquidación especial de determinados destiladores artesanales y beneficiarios del régimen de cosechero.",
    "Distingue Tarifa 1 y Tarifa 2, con plazos diferentes, y no se presenta durante periodos de inactividad de los aparatos.",
  ],
  notices: [
    {
      title: "Tarifa 1 y Tarifa 2 no comparten plazo",
      paragraphs: [
        "La Tarifa 1 se presenta antes de solicitar autorización para destilar. La Tarifa 2 puede ser mensual o trimestral y usa plazos posteriores especiales.",
      ],
    },
  ],
  type: "Autoliquidación especial de alcohol.",
  presenter:
    "Destilador artesanal o beneficiario incluido en el régimen especial de cosechero.",
  nonPresenter:
    "Productor, bodega, bar o destilería que no esté comprendido en esos regímenes.",
  periodicity:
    "Tarifa 1 por autorización; Tarifa 2 mensual o trimestral según el régimen.",
  deadline:
    "Tarifa 1 antes de solicitar autorización; Tarifa 2 trimestral en los primeros 20 días del segundo mes posterior y mensual en los primeros 20 días del tercer mes posterior.",
  channel: "Formulario electrónico, con relación RBRC cuando corresponda.",
  result:
    "Cuota especial a ingresar o resultado del periodo; no se presenta en inactividad de los aparatos.",
  included: [
    "Destilador, aparato, autorización y régimen.",
    "Orujos, alcohol obtenido, graduación y litros de alcohol puro.",
    "Tarifa, beneficiarios y relación RBRC.",
  ],
  excluded: [
    "Autoliquidación general del 563.",
    "Periodo sin actividad.",
    "Aplicación indistinta del plazo de ambas tarifas.",
  ],
  preparation: [
    "Confirmar régimen y tarifa.",
    "Acreditar autorización y actividad del aparato.",
    "Calcular litros de alcohol puro con medición válida.",
    "Preparar RBRC y conciliación de producto.",
  ],
  correction:
    "Corrige el periodo y tarifa por el cauce oficial; no conviertas inactividad en una declaración cero ni cambies la autorización retrospectivamente.",
  procedureSourceId: "aeat.model-559.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-559.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-559.download.2026-06-09",
  document: {
    label: "Instrucciones oficiales del Modelo 559",
    sourceId: "aeat.model-559.instructions-pdf.2022-06-10",
  },
  legalSourceIds: [
    "boe.excise-law-38-1992.consolidated.2026-06-30",
    "boe.excise-regulation-rd-1165-1995.consolidated.2025-01-23",
    "boe.order-eha-3482-2007.original",
  ],
  related: [
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description: "Autoliquidación general de alcohol y bebidas derivadas.",
    },
    {
      code: "518",
      href: "/consultor-fiscal/modelos/518",
      description: "Declaración previa de operaciones de trabajo.",
    },
    {
      code: "520",
      href: "/consultor-fiscal/modelos/520",
      description: "Resultado final de operaciones de trabajo.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta sin actividad?",
      answer:
        "No durante los periodos de inactividad de los aparatos, conforme al régimen descrito.",
    },
    {
      question: "¿Qué es la RBRC?",
      answer:
        "La relación de beneficiarios del régimen de cosechero que puede acompañar la información del modelo.",
    },
  ],
});

export const MODEL_560_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "560",
  category: EXCISE_CATEGORY,
  statusLabel: "Electricidad · Tipo y reducciones revisables",
  statusTone: "current",
  intro: [
    "El Modelo 560 autoliquida el Impuesto Especial sobre la Electricidad por comercializadoras, consumidores directos y otros contribuyentes inscritos.",
    "No lo presenta el consumidor doméstico ni un autónomo por pagar una factura; el tipo y las reducciones deben comprobarse para el ejercicio.",
  ],
  notices: [
    {
      title: "No hay calculadora permanente",
      paragraphs: [
        "Identifica CIE, contribuyente, energía, territorio y norma temporal. Los cambios de tipo y beneficios impiden aplicar una cifra fija a todos los periodos.",
      ],
    },
  ],
  type: "Autoliquidación del Impuesto Especial sobre la Electricidad.",
  presenter:
    "Comercializador, consumidor directo en mercado u otro contribuyente incluido e inscrito.",
  nonPresenter:
    "Consumidor doméstico o autónomo por el solo hecho de recibir una factura eléctrica.",
  periodicity:
    "Mensual o trimestral según el contribuyente y su periodo de liquidación.",
  deadline:
    "El previsto para el periodo y sujeto en el calendario vigente; confirma además la domiciliación.",
  channel:
    "Formulario electrónico, con desglose y fichero auxiliar cuando procedan.",
  result:
    "Cuota a ingresar del impuesto; en los supuestos generales dispensados no se presenta una declaración de cuota cero.",
  included: [
    "CIE, establecimiento y condición del contribuyente.",
    "Energía suministrada o consumida, base, reducciones, exenciones y tipo vigente.",
    "Desglose estatal/foral y centralización autorizada.",
  ],
  excluded: [
    "Factura del consumidor ordinario.",
    "Tipo histórico aplicado como actual.",
    "Declaración general de cuota cero cuando no es exigible.",
  ],
  preparation: [
    "Validar CIE y sujeto.",
    "Conciliar energía y facturación.",
    "Versionar tipo, reducción y periodo.",
    "Revisar territorio y centralización.",
  ],
  correction:
    "Usa la autoliquidación rectificativa cuando resulte aplicable al periodo y el sistema anterior para periodos previos; conserva la declaración corregida.",
  procedureSourceId: "aeat.model-560.procedure-home.2026-06-18",
  recordSourceId: "aeat.model-560.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-560.general-information.2026-06-30",
  additionalOfficialLinks: [
    {
      label: "Diseños de registro e importación",
      sourceId: "aeat.model-560.import-designs.2025-01-22",
    },
  ],
  legalSourceIds: [
    "boe.order-hac-172-2021.original",
    "boe.order-hac-1433-2024.original",
    "boe.excise-law-38-1992.consolidated.2026-06-30",
  ],
  related: [
    {
      code: "591",
      href: "/consultor-fiscal/modelos/591",
      description: "Información anual de pagos a productores eléctricos.",
    },
    {
      code: "583",
      href: "/consultor-fiscal/modelos/583",
      description: "Impuesto sobre el valor de la producción eléctrica.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta quien paga la luz?",
      answer:
        "No por ese solo hecho; lo presentan los contribuyentes definidos e inscritos.",
    },
    {
      question: "¿Se presenta siempre con cuota cero?",
      answer:
        "No. Existen supuestos generales de dispensa; revisa el sujeto y el periodo.",
    },
  ],
});

function alcoholManufacturingGuide(config: {
  code: "561" | "562" | "563" | "566";
  label: string;
  title: string;
  presenter: string;
  nonPresenter: string;
  units: string;
  included: readonly string[];
  excluded: readonly string[];
  procedure: string;
  record: string;
  related: readonly {
    code: string;
    href:
      | "/consultor-fiscal/modelos/548"
      | "/consultor-fiscal/modelos/553"
      | "/consultor-fiscal/modelos/559"
      | "/consultor-fiscal/modelos/515"
      | "/consultor-fiscal/modelos/517"
      | "/consultor-fiscal/modelos/563";
    description: string;
  }[];
}) {
  return createBatch4PracticalGuideV1({
    code: config.code,
    category: EXCISE_CATEGORY,
    statusLabel: config.label,
    statusTone: "current",
    intro: [
      config.title,
      "La tarifa y el plazo dependen del producto, sujeto, periodo y normativa vigente; no se aplica una cuota única sin clasificar la operación.",
    ],
    notices: [
      {
        title: "Operador y producto autorizados",
        paragraphs: [
          `${config.nonPresenter} Deben comprobarse CAE, epígrafe, unidad, régimen suspensivo, mermas y beneficios.`,
        ],
      },
    ],
    type: "Autoliquidación de un Impuesto Especial de fabricación.",
    presenter: config.presenter,
    nonPresenter: config.nonPresenter,
    periodicity:
      "Mensual o trimestral según el sujeto y el artículo 44.3 vigente.",
    deadline:
      "El correspondiente al periodo de liquidación del establecimiento; comprueba calendario, domiciliación y ejercicio.",
    channel:
      "Formulario electrónico oficial, con centralización solo cuando esté autorizada.",
    result:
      "Cuota del impuesto por producto y epígrafe, con exenciones, reducciones o ajustes acreditados.",
    included: [
      ...config.included,
      config.units,
      "CAE, establecimiento, régimen, mermas, pérdidas y exenciones.",
    ],
    excluded: config.excluded,
    preparation: [
      "Confirmar sujeto, CAE y establecimiento.",
      "Clasificar producto y epígrafe.",
      `Conciliar ${config.units}.`,
      "Versionar tipo, exención y periodo.",
    ],
    correction:
      "Corrige por el sistema aplicable al periodo y conserva la trazabilidad del producto, epígrafe y cuota original; no compenses sin soporte.",
    procedureSourceId: config.procedure,
    recordSourceId: config.record,
    legalSourceIds: [
      "boe.excise-law-38-1992.consolidated.2026-06-30",
      "boe.excise-regulation-rd-1165-1995.consolidated.2025-01-23",
      "boe.order-eha-3482-2007.original",
    ],
    related: config.related,
    specificFaq: [
      {
        question: "¿Se aplica el mismo tipo a todos los productos?",
        answer:
          "No. Deben clasificarse producto, epígrafe, unidad y ejercicio antes de determinar la tarifa.",
      },
      {
        question: "¿Puede centralizarse la presentación?",
        answer:
          "Solo cuando la normativa y la autorización del establecimiento lo permiten.",
      },
    ],
  });
}

export const MODEL_561_GUIDE_V1 = alcoholManufacturingGuide({
  code: "561",
  label: "Cerveza · Tarifa por producto y grado Plato",
  title:
    "El Modelo 561 autoliquida el Impuesto sobre la Cerveza de fábricas, depósitos y otros sujetos pasivos.",
  presenter:
    "Fábrica, depósito fiscal, destinatario registrado u otro sujeto pasivo autorizado de cerveza.",
  nonPresenter:
    "Bar, comercio o consumidor por vender o comprar cerveza de forma ordinaria.",
  units: "Hectolitros, graduación y grados Plato.",
  included: [
    "Cerveza y productos incluidos, también categorías de bajo grado.",
    "Base, epígrafe y tarifa por clasificación.",
  ],
  excluded: [
    "Venta minorista ordinaria.",
    "Una tarifa única para toda la cerveza.",
    "Declaración de operaciones 553.",
  ],
  procedure: "aeat.model-561.procedure-home.2026-06-09",
  record: "aeat.model-561.procedure-record.2026-06-09",
  related: [
    {
      code: "548",
      href: "/consultor-fiscal/modelos/548",
      description: "Cuotas repercutidas por cuenta ajena.",
    },
    {
      code: "553",
      href: "/consultor-fiscal/modelos/553",
      description: "Operaciones de vino y bebidas fermentadas.",
    },
  ],
});

export const MODEL_562_GUIDE_V1 = alcoholManufacturingGuide({
  code: "562",
  label: "Productos intermedios · Tranquilos y espumosos",
  title:
    "El Modelo 562 autoliquida el Impuesto sobre determinados Productos Intermedios.",
  presenter:
    "Fábrica, depósito fiscal u otro sujeto pasivo autorizado de productos intermedios.",
  nonPresenter:
    "Comercio o consumidor por vender o comprar el producto terminado.",
  units:
    "Hectolitros, graduación y condición de producto tranquilo o espumoso.",
  included: [
    "Productos intermedios tranquilos y espumosos.",
    "Diferencias territoriales aplicables a Canarias.",
  ],
  excluded: [
    "Cerveza, vino o bebida derivada mal clasificados.",
    "Clasificación basada solo en nombre comercial.",
    "Venta minorista ordinaria.",
  ],
  procedure: "aeat.model-562.procedure-home.2026-06-09",
  record: "aeat.model-562.procedure-record.2026-06-09",
  related: [
    {
      code: "548",
      href: "/consultor-fiscal/modelos/548",
      description: "Cuotas repercutidas por cuenta ajena.",
    },
    {
      code: "563",
      href: "/consultor-fiscal/modelos/563",
      description: "Alcohol y bebidas derivadas.",
    },
  ],
});

export const MODEL_563_GUIDE_V1 = alcoholManufacturingGuide({
  code: "563",
  label: "Alcohol y bebidas derivadas",
  title:
    "El Modelo 563 autoliquida el Impuesto sobre el Alcohol y Bebidas Derivadas.",
  presenter:
    "Fábrica, depósito fiscal u otro sujeto pasivo autorizado de alcohol y bebidas derivadas.",
  nonPresenter:
    "Bar, restaurante, tienda o consumidor por vender o adquirir bebidas de forma ordinaria.",
  units:
    "Hectolitros de alcohol puro a la graduación y temperatura de referencia.",
  included: [
    "Alcohol, licores y bebidas espirituosas incluidas.",
    "Diferencias territoriales de Canarias y usos con devolución.",
  ],
  excluded: [
    "Venta ordinaria en hostelería.",
    "Régimen artesanal específico del 559.",
    "Marca fiscal del 517 como autoliquidación.",
  ],
  procedure: "aeat.model-563.procedure-home.2026-06-09",
  record: "aeat.model-563.procedure-record.2026-06-09",
  related: [
    {
      code: "517",
      href: "/consultor-fiscal/modelos/517",
      description: "Marcas fiscales de bebidas derivadas.",
    },
    {
      code: "559",
      href: "/consultor-fiscal/modelos/559",
      description: "Régimen de destilación artesanal y cosechero.",
    },
    {
      code: "548",
      href: "/consultor-fiscal/modelos/548",
      description: "Cuotas repercutidas por cuenta ajena.",
    },
  ],
});

export const MODEL_566_GUIDE_V1 = alcoholManufacturingGuide({
  code: "566",
  label: "Labores del tabaco · Tarifa compuesta",
  title:
    "El Modelo 566 autoliquida el Impuesto sobre las Labores del Tabaco de fábricas, depósitos y otros sujetos pasivos.",
  presenter:
    "Fábrica, depósito fiscal u otro sujeto pasivo autorizado de labores del tabaco.",
  nonPresenter:
    "Estanco, comercio o consumidor por comprar o vender tabaco de forma ordinaria.",
  units:
    "Unidades o kilogramos, precio de venta al público y categoría de labor.",
  included: [
    "Cigarrillos, cigarros, cigarritos, picadura y demás labores incluidas.",
    "Componentes proporcional, específico y cuota mínima según categoría.",
  ],
  excluded: [
    "Venta minorista del estanco.",
    "Una tarifa única para todas las labores.",
    "Marcas fiscales del 515 como cuota.",
  ],
  procedure: "aeat.model-566.procedure-home.2026-06-09",
  record: "aeat.model-566.procedure-record.2026-06-09",
  related: [
    {
      code: "515",
      href: "/consultor-fiscal/modelos/515",
      description: "Solicitud y control de marcas fiscales de tabaco.",
    },
    {
      code: "548",
      href: "/consultor-fiscal/modelos/548",
      description: "Cuotas repercutidas por cuenta ajena.",
    },
  ],
});

export const MODEL_573_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "573",
  category: EXCISE_CATEGORY,
  statusLabel: "Vigente desde abril de 2025 · Mensual",
  statusTone: "current",
  effectiveYear: 2025,
  transitionYear: 2025,
  intro: [
    "El Modelo 573 autoliquida el impuesto sobre líquidos para cigarrillos electrónicos, bolsas de nicotina y otros productos de nicotina.",
    "El impuesto es exigible desde el 1 de abril de 2025, el periodo es mensual y las importaciones se liquidan en Aduanas.",
  ],
  notices: [
    {
      title: "No presentar cuota cero",
      paragraphs: [
        "Fuera de importación, se autoliquidan los devengos mensuales. El modelo no se presenta en periodos sin cantidad a ingresar; las existencias de 1 de abril de 2025 tienen su tratamiento transitorio propio.",
      ],
    },
  ],
  type: "Autoliquidación mensual de un Impuesto Especial de fabricación.",
  presenter:
    "Fabricante, depósito fiscal, adquirente intracomunitario u otro sujeto obligado de los productos incluidos.",
  nonPresenter:
    "Consumidor final ni importador por la liquidación aduanera; una tienda ordinaria debe revisar si introduce o adquiere el producto antes de descartarlo.",
  periodicity: "Mensual.",
  deadline:
    "Primeros 20 días naturales del mes siguiente; domiciliación ordinaria del 1 al 15.",
  channel:
    "Autoliquidación electrónica; las importaciones se liquidan mediante Aduanas.",
  result:
    "Cuota por categoría y unidad del producto; no se presenta cuando no hay cantidad a ingresar.",
  included: [
    "Líquidos con o sin nicotina comprendidos.",
    "Bolsas y otros productos de nicotina incluidos.",
    "Fabricación, depósito y adquisición intracomunitaria en Península/Baleares.",
  ],
  excluded: [
    "Importación liquidada en Aduanas.",
    "Canarias, Ceuta y Melilla fuera del territorio del impuesto.",
    "Modelo 566 de labores del tabaco.",
    "Declaración de cuota cero.",
  ],
  preparation: [
    "Clasificar producto y unidad.",
    "Confirmar registro territorial y sujeto.",
    "Conciliar fabricación, recepción, existencias y SILICIE.",
    "Separar importaciones y envíos A24/590.",
  ],
  correction:
    "Aplica complementaria o rectificativa según el periodo y conserva la declaración original; no regularices existencias de abril de 2025 sin que la obligación resulte exigible.",
  procedureSourceId: "aeat.model-573.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-573.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-573.faq.2026-03-27",
  document: {
    label: "Folleto oficial de productos de vapeo y nicotina",
    sourceId: "aeat.model-573.subject-brochure.2025-04-08",
  },
  legalSourceIds: [
    "boe.order-hac-86-2025.original",
    "boe.excise-law-38-1992.consolidated.2026-06-30",
  ],
  related: [
    {
      code: "548",
      href: "/consultor-fiscal/modelos/548",
      description: "Cuotas repercutidas por cuenta ajena.",
    },
    {
      code: "590",
      href: "/consultor-fiscal/modelos/590",
      description: "Devolución por exportación o determinados envíos.",
    },
    {
      code: "566",
      href: "/consultor-fiscal/modelos/566",
      description: "Autoliquidación distinta de labores del tabaco.",
    },
  ],
  specificFaq: [
    {
      question: "¿Incluye líquidos sin nicotina?",
      answer:
        "Sí, cuando encajan en la definición legal del impuesto; la clasificación no depende solo de contener nicotina.",
    },
    {
      question: "¿Cómo tributan las importaciones?",
      answer:
        "Las liquida Aduanas; no se incluyen como autoliquidación ordinaria del 573.",
    },
  ],
});

export const MODEL_581_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "581",
  category: EXCISE_CATEGORY,
  statusLabel: "Hidrocarburos · Formato vigente desde 2019",
  statusTone: "current",
  transitionYear: 2019,
  intro: [
    "El Modelo 581 autoliquida el Impuesto sobre Hidrocarburos por fábricas, depósitos, destinatarios y otros sujetos pasivos.",
    "El formato vigente se aplica desde 2019 y sustituye el uso corriente del antiguo Modelo 582 para regularizaciones territoriales.",
  ],
  notices: [
    {
      title: "Muchos epígrafes, unidades y tipos",
      paragraphs: [
        "Gasolinas, gasóleos, fuelóleos, gas natural, GLP y otros productos no comparten una única tarifa. Separa tipo general/especial, beneficios y territorio.",
      ],
    },
  ],
  type: "Autoliquidación del Impuesto sobre Hidrocarburos.",
  presenter:
    "Fábrica, depósito fiscal, almacén fiscal, destinatario registrado u otro sujeto pasivo incluido.",
  nonPresenter:
    "Consumidor final o gasolinera ordinaria por cada venta, salvo que concurra una condición específica de sujeto pasivo.",
  periodicity: "Mensual o trimestral según el sujeto y periodo legal.",
  deadline:
    "El previsto en el artículo 44.3 y calendario vigente para el sujeto y periodo.",
  channel:
    "Autoliquidación electrónica, con desglose territorial y centralización solo autorizada.",
  result: "Cuota por productos, unidades, tipos y beneficios acreditados.",
  included: [
    "Hidrocarburos y epígrafes incluidos.",
    "Tipo general y especial, exenciones, tipos reducidos y minoraciones.",
    "CAE, DDC, establecimiento y desglose territorial.",
  ],
  excluded: [
    "Venta ordinaria al consumidor como declaración individual.",
    "Modelo 582 para periodos actuales.",
    "Calculadora única para todos los productos.",
  ],
  preparation: [
    "Clasificar producto, epígrafe y unidad.",
    "Conciliar salidas, consumos, recepciones y existencias.",
    "Validar CAE y territorio.",
    "Versionar tipos y beneficios.",
  ],
  correction:
    "Corrige el periodo por el sistema oficial aplicable; para regularizaciones anteriores a 2019 revisa el 582 histórico sin trasladarlo a un periodo actual.",
  procedureSourceId: "aeat.models-581-582.procedure-home.2026-06-09",
  recordSourceId: "aeat.models-581-582.procedure-record.2026-06-09",
  helpSourceId: "aeat.models-581-582.actions.2026-06-09",
  legalSourceIds: ["boe.order-hac-135-2019.original"],
  related: [
    {
      code: "582",
      href: "/consultor-fiscal/modelos/582",
      description: "Regularización histórica anterior a 2019.",
    },
    {
      code: "572",
      href: "/consultor-fiscal/modelos/572",
      description: "Devolución por usos autorizados.",
    },
    {
      code: "590",
      href: "/consultor-fiscal/modelos/590",
      description: "Devolución por exportación o expedición.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué diferencia existe con el 582?",
      answer:
        "El 581 es el cauce vigente; el 582 queda limitado a regularizaciones de periodos anteriores a 2019.",
    },
    {
      question: "¿Lo presenta una gasolinera por cada venta?",
      answer:
        "No por ese solo hecho; debe concurrir la condición legal de sujeto pasivo.",
    },
  ],
});

export const MODEL_582_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "582",
  category: "Impuestos Especiales · Histórico",
  statusLabel: "Histórico · Solo periodos anteriores a 2019",
  statusTone: "historical",
  transitionYear: 2019,
  intro: [
    "El Modelo 582 regularizaba diferencias territoriales al reexpedir determinados hidrocarburos a otra comunidad autónoma.",
    "El BOE limita su formato a periodos de liquidación anteriores a 2019: no es una autoliquidación vigente para 2026.",
  ],
  notices: [
    {
      title: "Bloqueado para periodos actuales",
      paragraphs: [
        "Solo procede consultar, corregir o, cuando corresponda, presentar extemporáneamente un periodo histórico. Para periodos actuales revisa el Modelo 581.",
      ],
    },
  ],
  type: "Regularización territorial histórica.",
  presenter:
    "Reexpedidor obligado respecto de un trimestre y establecimiento anterior a 2019.",
  nonPresenter:
    "Cualquier operador respecto de un periodo iniciado en 2019 o posterior.",
  periodicity:
    "Trimestral y por establecimiento, solo en periodos anteriores a 2019.",
  deadline:
    "El plazo histórico del trimestre correspondiente; no existe plazo de presentación corriente para 2026.",
  channel:
    "Consulta y, cuando proceda, corrección o presentación extemporánea del periodo histórico.",
  result: "Regularización histórica que podía resultar a ingresar o devolver.",
  included: [
    "Reexpedición anterior a 2019.",
    "Comunidad de origen/destino y diferencia de tipos.",
    "Un modelo por trimestre y establecimiento.",
  ],
  excluded: [
    "Periodo 2019 o posterior.",
    "Autoliquidación ordinaria vigente.",
    "Nueva operación de 2026.",
  ],
  preparation: [
    "Acreditar periodo anterior a 2019.",
    "Identificar establecimiento y reexpedición.",
    "Reconstruir tipos autonómicos históricos.",
    "Conservar declaración y documentos originales.",
  ],
  correction:
    "Consulta el expediente histórico y corrige por el cauce aplicable al periodo; no conviertas la operación en una declaración actual.",
  procedureSourceId: "aeat.models-581-582.procedure-home.2026-06-09",
  recordSourceId: "aeat.models-581-582.procedure-record.2026-06-09",
  legalSourceIds: ["boe.order-hac-135-2019.original"],
  related: [
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description: "Autoliquidación vigente de hidrocarburos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puedo presentar un 582 de 2026?",
      answer:
        "No. El formato oficial se limita a periodos de liquidación anteriores a 2019.",
    },
    {
      question: "¿Podía resultar a devolver?",
      answer:
        "Sí, según la diferencia territorial histórica; debe acreditarse con la norma del periodo.",
    },
  ],
  allowProcedureAction: false,
  readOnlyActionLabel:
    "Consultar la información oficial del Modelo 582 histórico",
});

export const MODEL_595_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "595",
  category: EXCISE_CATEGORY,
  statusLabel: "Carbón · Autoliquidación trimestral",
  statusTone: "current",
  intro: [
    "El Modelo 595 autoliquida el Impuesto Especial sobre el Carbón por primeras ventas, entregas, autoconsumos u operaciones sujetas.",
    "No lo presenta el consumidor doméstico por comprar carbón; la base depende del poder energético y el uso puede determinar exención.",
  ],
  notices: [
    {
      title: "Uso y poder energético",
      paragraphs: [
        "Clasifica operación, producto, gigajulios y destino. No apliques una tarifa ni una exención sin la versión normativa del periodo.",
      ],
    },
  ],
  type: "Autoliquidación trimestral del Impuesto sobre el Carbón.",
  presenter:
    "Productor, extractor, importador, adquirente u otro sujeto pasivo incluido.",
  nonPresenter: "Consumidor doméstico por el solo hecho de comprar carbón.",
  periodicity: "Trimestral.",
  deadline:
    "El plazo trimestral previsto por el Reglamento y el calendario vigente.",
  channel: "Autoliquidación electrónica oficial.",
  result:
    "Cuota por poder energético y tipo vigente; puede no presentarse sin cuota en los supuestos dispensados.",
  included: [
    "Primera venta, entrega o autoconsumo sujeto.",
    "Importación/adquisición en los supuestos previstos.",
    "Uso, gigajulios, base, tipo y exenciones.",
  ],
  excluded: [
    "Compra doméstica como obligación del consumidor.",
    "Resumen anual informativo del 596.",
    "Declaración cero cuando existe dispensa.",
  ],
  preparation: [
    "Identificar sujeto y operación.",
    "Medir cantidad y poder energético.",
    "Acreditar uso y exenciones.",
    "Conciliar trimestre con existencias.",
  ],
  correction:
    "Corrige la autoliquidación del trimestre por el cauce vigente y conserva el soporte energético y de uso.",
  procedureSourceId: "aeat.model-595.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-595.procedure-record.2026-06-09",
  legalSourceIds: [
    "boe.order-eha-3947-2006.original",
    "boe.order-hfp-292-2018.original",
  ],
  related: [
    {
      code: "596",
      href: "/consultor-fiscal/modelos/596",
      description: "Declaración anual de operaciones y existencias de carbón.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta quien compra carbón para casa?",
      answer:
        "No por ese solo hecho; la obligación recae en los sujetos pasivos definidos.",
    },
    {
      question: "¿Cómo se determina la base?",
      answer:
        "Con la cantidad y el poder energético expresado en las unidades legales, no solo con el peso comercial.",
    },
  ],
});

export const MODEL_596_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "596",
  category: EXCISE_CATEGORY,
  statusLabel: "Carbón · Declaración anual informativa",
  statusTone: "current",
  intro: [
    "El Modelo 596 informa anualmente de operaciones, destinatarios y existencias del Impuesto Especial sobre el Carbón.",
    "No vuelve a pagar el impuesto y debe conciliarse con las autoliquidaciones trimestrales del Modelo 595.",
  ],
  notices: [
    {
      title: "También puede haber obligación con existencias",
      paragraphs: [
        "La declaración puede ser exigible aunque no haya nuevas operaciones y solo existan existencias. Con varios establecimientos se utiliza una hoja de actividad por cada uno.",
      ],
    },
  ],
  type: "Declaración informativa anual.",
  presenter: "Titular obligado a informar operaciones y existencias de carbón.",
  nonPresenter: "Consumidor final sin la condición de operador obligado.",
  periodicity: "Anual.",
  deadline: "Primeros 20 días naturales del año siguiente.",
  channel: "Declaración electrónica con resumen general y hojas de actividad.",
  result: "Información anual sin nuevo ingreso, conciliada con el 595.",
  included: [
    "Existencias iniciales y finales.",
    "Entradas, extracción, importaciones, adquisiciones, salidas, ventas y autoconsumos.",
    "Destinatarios, NIF, uso, cantidad y poder energético.",
  ],
  excluded: [
    "Nuevo pago del impuesto.",
    "Autoliquidación trimestral del 595.",
    "Omitir un establecimiento o las existencias sin movimientos.",
  ],
  preparation: [
    "Conciliar existencias y movimientos.",
    "Revisar destinatarios y usos.",
    "Preparar una hoja por establecimiento.",
    "Conciliar los cuatro trimestres del 595.",
  ],
  correction:
    "Corrige la declaración anual sin modificar las autoliquidaciones 595 salvo que también contengan un error propio.",
  procedureSourceId: "aeat.model-596.procedure-home.2026-03-09",
  recordSourceId: "aeat.model-596.procedure-record.2026-06-09",
  legalSourceIds: [
    "boe.order-eha-3947-2006.original",
    "boe.order-hfp-292-2018.original",
  ],
  related: [
    {
      code: "595",
      href: "/consultor-fiscal/modelos/595",
      description: "Autoliquidación trimestral del Impuesto sobre el Carbón.",
    },
  ],
  specificFaq: [
    {
      question: "¿Genera un pago?",
      answer: "No. Es informativo; las cuotas se liquidan mediante el 595.",
    },
    {
      question: "¿Se presenta si solo hay existencias?",
      answer:
        "Puede ser obligatorio; las existencias forman parte de la información anual.",
    },
  ],
});
