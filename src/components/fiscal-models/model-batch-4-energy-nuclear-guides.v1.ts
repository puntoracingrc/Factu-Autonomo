import { createBatch4PracticalGuideV1 } from "./create-batch-4-practical-guide.v1";

const ENERGY_CATEGORY = "Energía, producción eléctrica y residuos nucleares";

export const MODEL_583_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "583",
  category: ENERGY_CATEGORY,
  statusLabel: "Producción eléctrica · Pagos fraccionados y anual",
  statusTone: "current",
  intro: [
    "El Modelo 583 liquida el Impuesto sobre el Valor de la Producción de la Energía Eléctrica por los productores sujetos al impuesto.",
    "Combina pagos fraccionados durante el año con una autoliquidación anual posterior; no es una declaración del consumidor ni del comercializador por el solo hecho de pagar energía.",
  ],
  notices: [
    {
      title: "Dos calendarios distintos",
      paragraphs: [
        "Los pagos fraccionados se presentan en mayo, septiembre, noviembre y febrero, mientras que la autoliquidación anual se presenta durante noviembre del año siguiente. Los contribuyentes que no superan el umbral oficial revisan la regla de pago único de noviembre.",
      ],
    },
  ],
  type: "Autoliquidación y pagos fraccionados del impuesto sobre la producción eléctrica.",
  presenter:
    "Productor de energía eléctrica titular de una instalación incluida en el impuesto.",
  nonPresenter:
    "Consumidor, comercializador o pagador de energía por esa sola condición.",
  periodicity:
    "Pagos fraccionados en mayo, septiembre, noviembre y febrero, más autoliquidación anual.",
  deadline:
    "Pagos dentro de los plazos oficiales de esos meses; autoliquidación anual del 1 al 30 de noviembre del año siguiente. Revisa la regla simplificada cuando el valor anual no supera 500.000 euros.",
  channel:
    "Formulario electrónico por contribuyente e instalación, con los datos de producción y valor comprobados.",
  result:
    "Cuota a ingresar, descontando los pagos fraccionados que correspondan sin duplicarlos.",
  included: [
    "Instalación, tecnología, energía producida e incorporada al sistema.",
    "Valor de producción, pagos fraccionados y cuota anual.",
    "Ceses y periodos especiales que deban coordinarse con el Modelo 588.",
  ],
  excluded: [
    "Factura eléctrica del consumidor.",
    "Información anual del pagador del Modelo 591.",
    "Confundir el pago fraccionado con la autoliquidación anual.",
  ],
  preparation: [
    "Identificar contribuyente e instalación.",
    "Conciliar producción, liquidaciones y valor de mercado.",
    "Separar cada pago fraccionado de la cuota anual.",
    "Revisar cese, umbral y ejercicio aplicables.",
  ],
  correction:
    "Corrige el periodo afectado por el cauce vigente y vuelve a conciliar los pagos fraccionados con la cuota anual; no dupliques deducciones.",
  procedureSourceId: "aeat.models-583-588.procedure-home.2026-02-05",
  recordSourceId: "aeat.models-583-588.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-583.information-faq.2026-07-09",
  legalSourceIds: ["boe.order-hap-703-2013.original"],
  related: [
    {
      code: "588",
      href: "/consultor-fiscal/modelos/588",
      description: "Autoliquidación por determinados ceses anticipados.",
    },
    {
      code: "591",
      href: "/consultor-fiscal/modelos/591",
      description:
        "Información anual presentada por quienes pagan a productores.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuándo se presenta la anual?",
      answer: "Durante noviembre del año siguiente al ejercicio liquidado.",
    },
    {
      question: "¿Qué ocurre si cesa la actividad?",
      answer:
        "Debe comprobarse si corresponde el Modelo 588 y cómo se regularizan los pagos ya efectuados.",
    },
  ],
});

export const MODEL_584_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "584",
  category: ENERGY_CATEGORY,
  statusLabel: "Combustible nuclear gastado · Producción",
  statusTone: "current",
  intro: [
    "El Modelo 584 autoliquida el impuesto vinculado a la producción de combustible nuclear gastado y residuos radiactivos resultantes de la generación nucleoeléctrica.",
    "La obligación recae en el contribuyente que produce esos materiales, no en cualquier productor eléctrico ni en el gestor del almacenamiento centralizado.",
  ],
  notices: [
    {
      title: "Producción y almacenamiento son hechos distintos",
      paragraphs: [
        "El 584 corresponde a la producción; el almacenamiento centralizado se liquida mediante el 585. La masa y la clasificación del material deben acreditarse.",
      ],
    },
  ],
  type: "Autoliquidación del impuesto sobre producción de combustible nuclear gastado y residuos radiactivos.",
  presenter:
    "Titular de la instalación nuclear que produce el combustible gastado o los residuos sujetos.",
  nonPresenter:
    "Productor eléctrico no nuclear, consumidor o gestor que solo almacena material en una instalación centralizada.",
  periodicity:
    "Pagos fraccionados y autoliquidación conforme al ciclo y al periodo oficial del impuesto.",
  deadline:
    "Pagos fraccionados en los plazos de junio y diciembre y autoliquidación en los primeros 20 días siguientes al periodo previsto; confirma el calendario del ejercicio.",
  channel:
    "Presentación electrónica con identificación de la instalación, material, masa y clasificación.",
  result:
    "Cuota según el hecho imponible, las magnitudes acreditadas y la tarifa vigente.",
  included: [
    "Instalación nuclear y titular.",
    "Kilogramos o metros cúbicos, naturaleza y clasificación del material.",
    "Pagos fraccionados y cuota del periodo.",
  ],
  excluded: [
    "Producción eléctrica no nuclear.",
    "Almacenamiento centralizado del Modelo 585.",
    "Estimaciones sin medición y documentación técnica.",
  ],
  preparation: [
    "Confirmar instalación y contribuyente.",
    "Obtener mediciones certificadas.",
    "Clasificar combustible y residuos.",
    "Conciliar pagos y autoliquidación.",
  ],
  correction:
    "Rectifica la magnitud, clasificación o periodo por el cauce oficial y conserva la evidencia técnica que justifica el cambio.",
  procedureSourceId: "aeat.model-584.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-584.procedure-record.2026-06-09",
  legalSourceIds: ["boe.order-hap-538-2013.original"],
  related: [
    {
      code: "585",
      href: "/consultor-fiscal/modelos/585",
      description: "Almacenamiento de combustible nuclear gastado y residuos.",
    },
    {
      code: "583",
      href: "/consultor-fiscal/modelos/583",
      description: "Valor de la producción de energía eléctrica.",
    },
  ],
  specificFaq: [
    {
      question: "¿Es lo mismo que el 585?",
      answer:
        "No. El 584 grava producción y el 585 almacenamiento centralizado.",
    },
    {
      question: "¿Basta con estimar la masa?",
      answer:
        "No debe sustituirse la medición y clasificación técnica exigible por una aproximación sin soporte.",
    },
  ],
});

export const MODEL_585_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "585",
  category: ENERGY_CATEGORY,
  statusLabel: "Residuos nucleares · Almacenamiento centralizado",
  statusTone: "current",
  intro: [
    "El Modelo 585 autoliquida el impuesto sobre el almacenamiento de combustible nuclear gastado y residuos radiactivos en instalaciones centralizadas.",
    "No sustituye al Modelo 584: identifica otro hecho imponible, otro operador y datos propios de entrada, permanencia y volumen almacenado.",
  ],
  notices: [
    {
      title: "Identifica al operador real",
      paragraphs: [
        "La mera producción del residuo no convierte automáticamente al productor en declarante del 585; debe comprobarse quién explota la instalación centralizada.",
      ],
    },
  ],
  type: "Autoliquidación del impuesto sobre almacenamiento nuclear centralizado.",
  presenter:
    "Titular u operador de la instalación centralizada que realiza el almacenamiento sujeto.",
  nonPresenter:
    "Productor del material por esa sola condición o instalación que no cumple el supuesto de almacenamiento centralizado.",
  periodicity:
    "Por los periodos y pagos definidos para el almacenamiento sujeto.",
  deadline:
    "El fijado en el calendario oficial del periodo, atendiendo a pagos fraccionados y autoliquidación.",
  channel:
    "Formulario electrónico con instalación, material, fechas, masas o volúmenes y pagos previos.",
  result:
    "Cuota de almacenamiento calculada con las magnitudes y tarifas del periodo aplicable.",
  included: [
    "Instalación centralizada y operador.",
    "Entradas, permanencia, masa o volumen y tipo de residuo.",
    "Pagos y cuota del periodo.",
  ],
  excluded: [
    "Producción del material liquidada en el 584.",
    "Almacenamiento no incluido en el hecho imponible.",
    "Cantidades no conciliadas con registros técnicos.",
  ],
  preparation: [
    "Validar titular e instalación.",
    "Conciliar inventario y movimientos.",
    "Clasificar material y unidad.",
    "Versionar tarifa y periodo.",
  ],
  correction:
    "Corrige el periodo y la magnitud afectados con soporte del inventario técnico; no traslades automáticamente ajustes del 584.",
  procedureSourceId: "aeat.model-585.procedure-home.2026-02-05",
  recordSourceId: "aeat.model-585.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-585.download.2026-06-09",
  document: {
    label: "Formulario e instrucciones oficiales del Modelo 585",
    sourceId: "aeat.model-585.instructions-pdf.2013-04-17",
  },
  legalSourceIds: ["boe.order-hap-538-2013.original"],
  related: [
    {
      code: "584",
      href: "/consultor-fiscal/modelos/584",
      description: "Producción de combustible nuclear gastado y residuos.",
    },
  ],
  specificFaq: [
    {
      question: "¿Quién es el declarante?",
      answer:
        "El titular u operador que realiza el almacenamiento centralizado sujeto, no cualquier productor.",
    },
    {
      question: "¿Qué debe conciliarse?",
      answer:
        "Inventario, entradas, permanencia, masa o volumen, clasificación, pagos y periodo.",
    },
  ],
});

export const MODEL_588_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "588",
  category: ENERGY_CATEGORY,
  statusLabel: "Producción eléctrica · Cese anticipado",
  statusTone: "current",
  intro: [
    "El Modelo 588 liquida el Impuesto sobre el Valor de la Producción de la Energía Eléctrica en determinados ceses ocurridos antes del cierre ordinario.",
    "No es una alternativa general al 583: solo se utiliza si el cese y su fecha encajan en el procedimiento específico.",
  ],
  notices: [
    {
      title: "Cese antes del 31 de octubre",
      paragraphs: [
        "El procedimiento contempla ceses entre enero y octubre y su presentación durante noviembre del mismo año. Si no concurre ese supuesto, debe seguirse el calendario ordinario del 583.",
      ],
    },
  ],
  type: "Autoliquidación por cese anticipado de producción eléctrica.",
  presenter:
    "Productor sujeto que cesa definitivamente en el supuesto temporal previsto oficialmente.",
  nonPresenter:
    "Instalación que continúa activa o cuyo cese no encaja en la regla especial.",
  periodicity: "Una vez por el cese que cumple los requisitos.",
  deadline:
    "Durante noviembre del mismo año para los ceses comprendidos entre enero y octubre, según el procedimiento vigente.",
  channel:
    "Formulario electrónico del procedimiento compartido 583/588, seleccionando el modelo y ejercicio correctos.",
  result:
    "Regularización final de la cuota hasta el cese, descontando correctamente pagos previos.",
  included: [
    "Fecha efectiva de cese e instalación.",
    "Producción y valor hasta el cese.",
    "Pagos fraccionados imputables.",
  ],
  excluded: [
    "Cese temporal o no acreditado.",
    "Autoliquidación anual ordinaria sin supuesto especial.",
    "Deducir dos veces los pagos del 583.",
  ],
  preparation: [
    "Acreditar cese definitivo y fecha.",
    "Cerrar mediciones y liquidaciones.",
    "Conciliar pagos del 583.",
    "Comprobar ventana de noviembre.",
  ],
  correction:
    "Rectifica la autoliquidación especial sin alterar la fecha de cese sin evidencia y vuelve a conciliar los pagos del 583.",
  procedureSourceId: "aeat.models-583-588.procedure-home.2026-02-05",
  recordSourceId: "aeat.models-583-588.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-583.information-faq.2026-07-09",
  legalSourceIds: ["boe.order-hfp-1123-2022.original"],
  related: [
    {
      code: "583",
      href: "/consultor-fiscal/modelos/583",
      description: "Pagos fraccionados y autoliquidación anual ordinaria.",
    },
    {
      code: "591",
      href: "/consultor-fiscal/modelos/591",
      description: "Información anual de quienes realizan pagos a productores.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sustituye siempre al 583 si cierro?",
      answer:
        "No. Deben cumplirse el tipo de cese y la ventana temporal del procedimiento 588.",
    },
    {
      question: "¿Qué pasa con los pagos previos?",
      answer:
        "Se concilian y descuentan una sola vez en la regularización que corresponda.",
    },
  ],
});

export const MODEL_589_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "589",
  category: ENERGY_CATEGORY,
  statusLabel: "Hidrocarburos · Extracción en territorio español",
  statusTone: "current",
  intro: [
    "El Modelo 589 autoliquida el Impuesto sobre el Valor de la Extracción de Gas, Petróleo y Condensados.",
    "La obligación corresponde al titular que realiza la extracción sujeta, no a la comercializadora ni al consumidor del hidrocarburo.",
  ],
  notices: [
    {
      title: "Pago y autoliquidación anual",
      paragraphs: [
        "Distingue el pago fraccionado de octubre de la autoliquidación anual de abril y concilia cantidades, calidad y valor de extracción.",
      ],
    },
  ],
  type: "Pago fraccionado y autoliquidación del impuesto sobre extracción de hidrocarburos.",
  presenter:
    "Persona o entidad que realiza la extracción sujeta de gas, petróleo o condensados en territorio español.",
  nonPresenter:
    "Comercializador, distribuidor o consumidor que no realiza la extracción.",
  periodicity: "Pago fraccionado anual y autoliquidación anual.",
  deadline:
    "Pago fraccionado del 1 al 20 de octubre y autoliquidación anual del 1 al 20 de abril del año siguiente.",
  channel:
    "Formulario electrónico con concesión o explotación, producto, volumen, calidad, valor y pagos.",
  result:
    "Cuota anual del impuesto, descontando el pago fraccionado procedente.",
  included: [
    "Explotación y titular.",
    "Gas, petróleo y condensados extraídos.",
    "Volumen, calidad, valor y pago fraccionado.",
  ],
  excluded: [
    "Compraventa o distribución sin extracción.",
    "Impuestos de fabricación sobre hidrocarburos.",
    "Doble descuento del pago de octubre.",
  ],
  preparation: [
    "Identificar explotación y titular.",
    "Cerrar mediciones de producción.",
    "Valorar por producto y periodo.",
    "Conciliar pago de octubre y anual.",
  ],
  correction:
    "Rectifica la magnitud o valoración del periodo con trazabilidad técnica y económica y recalcula una sola vez el pago previo.",
  procedureSourceId: "aeat.model-589.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-589.procedure-record.2026-06-09",
  legalSourceIds: ["boe.order-hap-1349-2016.original"],
  related: [
    {
      code: "581",
      href: "/consultor-fiscal/modelos/581",
      description:
        "Impuesto sobre hidrocarburos por establecimiento y periodo.",
    },
  ],
  specificFaq: [
    {
      question: "¿Lo presenta la comercializadora?",
      answer:
        "No por comercializar: la obligación nace para quien realiza la extracción sujeta.",
    },
    {
      question: "¿Cuándo se regulariza el ejercicio?",
      answer:
        "En la autoliquidación anual de abril, conciliada con el pago fraccionado de octubre.",
    },
  ],
});

export const MODEL_591_GUIDE_V1 = createBatch4PracticalGuideV1({
  code: "591",
  category: ENERGY_CATEGORY,
  statusLabel: "Producción eléctrica · Información de pagos",
  statusTone: "current",
  intro: [
    "El Modelo 591 informa anualmente de las operaciones y pagos realizados con contribuyentes del impuesto sobre la producción eléctrica.",
    "Lo presentan quienes satisfacen los importes informados; no sustituye las autoliquidaciones 583 o 588 del productor.",
  ],
  notices: [
    {
      title: "Pagador y productor tienen obligaciones distintas",
      paragraphs: [
        "El pagador informa en el 591 durante diciembre. El productor mantiene, cuando corresponda, sus modelos 583 o 588.",
      ],
    },
  ],
  type: "Declaración informativa anual de operaciones con contribuyentes.",
  presenter:
    "Persona o entidad que satisface importes a contribuyentes del impuesto sobre el valor de la producción eléctrica.",
  nonPresenter:
    "Productor por el solo hecho de producir, ni consumidor final sin pagos de la naturaleza informada.",
  periodicity: "Anual.",
  deadline:
    "Primeros 20 días naturales de diciembre del año siguiente al ejercicio informado, conforme al procedimiento vigente.",
  channel:
    "Presentación electrónica con perceptores, instalaciones, importes y diseños de registro del ejercicio.",
  result:
    "Información anual; no liquida ni paga la cuota del impuesto del productor.",
  included: [
    "Identificación del pagador y del perceptor.",
    "Instalación, ejercicio e importes satisfechos.",
    "Diseño de registro vigente y claves exigidas.",
  ],
  excluded: [
    "Autoliquidación 583 del productor.",
    "Cese especial 588.",
    "Pagos ajenos al ámbito informativo.",
  ],
  preparation: [
    "Identificar perceptores e instalaciones.",
    "Conciliar pagos y liquidaciones.",
    "Usar el diseño del ejercicio.",
    "Validar NIF, claves y totales.",
  ],
  correction:
    "Presenta la corrección informativa por el mecanismo oficial y reconcilia altas, bajas y sustituciones sin alterar las autoliquidaciones del productor.",
  procedureSourceId: "aeat.model-591.procedure-home.2026-06-09",
  recordSourceId: "aeat.model-591.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-591.download.2026-03-10",
  document: {
    label: "Formulario e instrucciones oficiales del Modelo 591",
    sourceId: "aeat.model-591.instructions-pdf",
  },
  legalSourceIds: [
    "boe.order-hap-2328-2014.original",
    "boe.order-hac-1433-2024.original",
  ],
  related: [
    {
      code: "583",
      href: "/consultor-fiscal/modelos/583",
      description: "Autoliquidación del productor y pagos fraccionados.",
    },
    {
      code: "588",
      href: "/consultor-fiscal/modelos/588",
      description: "Autoliquidación del productor por cese anticipado.",
    },
  ],
  specificFaq: [
    {
      question: "¿Genera una cuota?",
      answer:
        "No. Es una declaración informativa anual de los pagos u operaciones identificados.",
    },
    {
      question: "¿Sustituye al 583?",
      answer:
        "No. El 591 es del pagador y el 583 liquida la obligación del productor.",
    },
  ],
});
