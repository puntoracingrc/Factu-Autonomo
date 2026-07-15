import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía describe el modelo estatal. Si el inmueble está en País Vasco o Navarra debe comprobarse qué Administración es competente.";

export const MODEL_211_GUIDE_V1 = {
  code: "211",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "Los enlaces abren recursos oficiales. Esta web no recibe escrituras, datos bancarios o identificativos y no presenta ni paga la retención.",
  intro: [
    "El Modelo 211 lo presenta quien compra un inmueble situado en España a una persona o entidad no residente sin establecimiento permanente. El comprador retiene e ingresa el 3 % de la contraprestación atribuible a los vendedores no residentes.",
    "Ese 3 % no es el impuesto definitivo sobre la ganancia y no se calcula sobre el beneficio: es un pago a cuenta que el vendedor incorpora después a su Modelo 210 o, cuando corresponda, a su Modelo 151.",
  ],
  notices: [
    {
      title: "La obligación recae en el comprador",
      paragraphs: [
        "No debe esperarse a que el vendedor presente su declaración. El adquirente debe identificar la residencia fiscal de cada transmitente y cumplir el plazo del Modelo 211.",
      ],
    },
    {
      title: "Residencia fiscal, no nacionalidad",
      paragraphs: [
        "Pasaporte, NIE, domicilio, banco o país de nacimiento no deciden por sí solos la residencia. Debe solicitarse prueba suficiente y revisar el convenio cuando sea relevante.",
      ],
    },
    { title: "Ámbito territorial", paragraphs: [TERRITORIAL_NOTE] },
  ],
  actions: [
    {
      label: "Abrir las gestiones oficiales del Modelo 211",
      sourceId: "aeat.model-211.procedure-home.2026-07-02",
      primary: true,
    },
    {
      label: "Consultar las instrucciones oficiales",
      sourceId: "aeat.model-211.instructions.2026-06-09",
      primary: true,
    },
    {
      label: "Ver la declaración del vendedor Modelo 210",
      internalHref: "/consultor-fiscal/modelos/210",
    },
    {
      label: "Consultar la ayuda electrónica",
      sourceId: "aeat.model-211.electronic-help.2026-06-19",
    },
  ],
  quickSummaryTitle: "El Modelo 211 en pocas palabras",
  quickFacts: [
    {
      label: "Quién presenta",
      value: "La persona o entidad que adquiere el inmueble.",
    },
    {
      label: "Cuándo",
      value:
        "Cuando el transmitente es no residente sin establecimiento permanente y no concurre una excepción acreditada.",
    },
    {
      label: "Importe",
      value:
        "3 % de la contraprestación correspondiente a los vendedores no residentes.",
    },
    { label: "Plazo", value: "Un mes desde la fecha de transmisión." },
    {
      label: "Número de declaraciones",
      value:
        "Una por cada inmueble adquirido, aunque existan varios compradores o vendedores.",
    },
    {
      label: "Después",
      value:
        "El comprador entrega copia al vendedor, que utiliza la retención en su declaración.",
    },
  ],
  sections: [
    {
      id: "model-211-parties",
      title: "Quién compra, quién vende y quién declara",
      cards: [
        {
          title: "Adquirente",
          paragraphs: [
            "El comprador, sea residente o no residente, presenta el Modelo 211 e ingresa la retención cuando se cumplen las condiciones.",
          ],
        },
        {
          title: "Transmitente",
          paragraphs: [
            "El vendedor no residente soporta la retención y recibe una copia del 211. Después declara la ganancia o pérdida mediante el modelo que corresponda.",
          ],
        },
        {
          title: "Representante",
          paragraphs: [
            "Puede intervenir un representante, pero la obligación material y la identificación de las partes deben quedar correctamente documentadas.",
          ],
        },
      ],
    },
    {
      id: "model-211-base",
      title: "Cómo funciona el 3 %",
      cards: [
        {
          title: "Base de la retención",
          paragraphs: [
            "Se aplica sobre la contraprestación acordada correspondiente a los vendedores no residentes, no sobre la ganancia, el valor catastral ni el dinero que finalmente reciben después de cancelar cargas.",
          ],
        },
        {
          title: "Vendedores residentes y no residentes",
          paragraphs: [
            "Si solo algunos vendedores son no residentes, se retiene sobre la parte del precio que les sea atribuible según su titularidad.",
          ],
        },
        {
          title: "No es la cuota definitiva",
          paragraphs: [
            "El vendedor calcula su resultado en el Modelo 210 y resta el 3 % ingresado. Puede resultar una cantidad adicional o una devolución.",
          ],
        },
      ],
      note: "Ejemplo didáctico: si el precio atribuible a vendedores no residentes es 200.000 €, la retención es 6.000 €. No significa que la ganancia sea 200.000 € ni que la cuota final sea 6.000 €.",
    },
    {
      id: "model-211-multiple",
      title: "Varios compradores, vendedores o inmuebles",
      cards: [
        {
          title: "Varios compradores",
          paragraphs: [
            "La declaración identifica a los adquirentes y sus porcentajes. La suma debe concordar con la escritura.",
          ],
        },
        {
          title: "Varios vendedores",
          paragraphs: [
            "Se detallan los transmitentes y se separa la parte de contraprestación atribuible a quienes sean no residentes.",
          ],
        },
        {
          title: "Varios inmuebles",
          paragraphs: [
            "Se presenta un Modelo 211 independiente por cada inmueble, aunque todos figuren en la misma escritura.",
          ],
        },
        {
          title: "Anexos",
          paragraphs: [
            "Cuando el formulario no tenga espacio suficiente, se utiliza el anexo o mecanismo oficial para relacionar a todas las partes.",
          ],
        },
      ],
    },
    {
      id: "model-211-deadline",
      title: "Plazo, pago y justificante",
      cards: [
        {
          title: "Un mes",
          paragraphs: [
            "La presentación e ingreso se realizan dentro del mes siguiente a la fecha de transmisión. No se cuenta desde la inscripción registral ni desde el pago total aplazado.",
          ],
        },
        {
          title: "Pago",
          paragraphs: [
            "El formulario ofrece las modalidades habilitadas por la AEAT. Debe conservarse el NRC u otra referencia de pago junto al justificante.",
          ],
        },
        {
          title: "Copia para el vendedor",
          paragraphs: [
            "El comprador entrega al transmitente no residente una copia del Modelo 211 para que pueda acreditar la retención en su declaración.",
          ],
        },
      ],
    },
    {
      id: "model-211-after",
      title: "Qué hace después el vendedor",
      cards: [
        {
          title: "Modelo 210",
          paragraphs: [
            "Como regla general, declara la ganancia o pérdida dentro de los tres meses posteriores al final del mes concedido al comprador para presentar el 211.",
          ],
          links: [
            { label: "Ver Modelo 210", href: "/consultor-fiscal/modelos/210" },
          ],
        },
        {
          title: "Modelo 151",
          paragraphs: [
            "Si el vendedor tributa válidamente por el régimen especial de desplazados, debe revisar el tratamiento de la transmisión en su declaración anual.",
          ],
          links: [
            { label: "Ver Modelo 151", href: "/consultor-fiscal/modelos/151" },
          ],
        },
        {
          title: "Retención superior a la cuota",
          paragraphs: [
            "Cuando el 3 % excede la cuota resultante, el vendedor puede solicitar la devolución con la declaración y las pruebas correspondientes.",
          ],
        },
      ],
    },
    {
      id: "model-211-exceptions",
      title: "Excepciones y comprobaciones",
      cards: [
        {
          title: "Acreditación de residencia",
          paragraphs: [
            "Si el vendedor afirma ser residente fiscal en España debe aportar prueba suficiente. La mera dirección española de la escritura no elimina la retención.",
          ],
        },
        {
          title: "Aportación a una sociedad",
          paragraphs: [
            "Las instrucciones recogen supuestos específicos, como determinadas aportaciones de inmuebles en la constitución o aumento de capital de sociedades residentes. La excepción debe acreditarse, no presumirse.",
          ],
        },
        {
          title: "Responsabilidad del inmueble",
          paragraphs: [
            "Si no se ingresa la retención, la normativa prevé la afección del inmueble al pago, sin perjuicio de responsabilidades del adquirente.",
          ],
        },
      ],
    },
    {
      id: "model-211-other-taxes",
      title: "No sustituye otros impuestos y trámites",
      accordions: [
        {
          question: "¿Sustituye al ITP, IVA o AJD?",
          paragraphs: [
            "No. El Modelo 211 es una retención del IRNR. La compraventa puede tener además ITP, IVA, AJD, plusvalía municipal u otras obligaciones independientes.",
          ],
        },
        {
          question: "¿Sustituye la escritura o el Registro?",
          paragraphs: [
            "No. La escritura, impuestos de adquisición, inscripción y comunicaciones tienen procedimientos propios.",
          ],
        },
        {
          question: "¿Lo presenta la notaría?",
          paragraphs: [
            "La obligación corresponde al adquirente, aunque la notaría, gestoría o representante pueda ayudar. El comprador debe conservar evidencia de la presentación y pago.",
          ],
        },
      ],
    },
    {
      id: "model-211-checklist",
      title: "Documentos que conviene reunir",
      cards: [
        {
          title: "De la operación",
          bullets: [
            "Escritura o contrato y fecha de transmisión.",
            "Precio total y forma de pago.",
            "Referencia catastral e identificación del inmueble.",
            "Porcentajes de compradores y vendedores.",
          ],
        },
        {
          title: "De las partes",
          bullets: [
            "NIF/NIE o identificador fiscal extranjero.",
            "Certificados de residencia fiscal cuando procedan.",
            "Domicilios y representación acreditada.",
            "Reparto del precio atribuible a cada transmitente.",
          ],
        },
      ],
      note: "No almacenes esa documentación en esta ficha. Utiliza canales profesionales y oficiales seguros.",
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 211",
  fillingSteps: [
    {
      title: "1. Identifica cada inmueble y cada parte",
      paragraphs: [
        "Comprueba titularidades, porcentajes, residencia fiscal y fecha de transmisión.",
      ],
    },
    {
      title: "2. Separa la contraprestación no residente",
      paragraphs: [
        "Atribuye el precio según la titularidad sin aplicar el 3 % a la parte de vendedores residentes.",
      ],
    },
    {
      title: "3. Calcula la retención",
      paragraphs: [
        "Aplica el 3 % a la contraprestación atribuible a no residentes; no calcules aquí la ganancia.",
      ],
    },
    {
      title: "4. Presenta una declaración por inmueble",
      paragraphs: [
        "Incluye anexos cuando existan varias partes y paga dentro del mes.",
      ],
    },
    {
      title: "5. Entrega y conserva el justificante",
      paragraphs: [
        "Entrega copia al vendedor y conserva declaración, pago, escritura y acreditaciones.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Vendedor",
      description:
        "Incorpora la retención a su Modelo 210 o al régimen declarativo que corresponda.",
    },
    {
      title: "Comprador",
      description:
        "Conserva el justificante para acreditar que cumplió la obligación dentro del mes.",
    },
    {
      title: "Corrección",
      description:
        "Si hay un error, utiliza una declaración complementaria o la solicitud de rectificación que corresponda antes de que la incoherencia llegue a la declaración del vendedor.",
    },
  ],
  comparison: {
    title: "Modelo 211 y declaración del vendedor",
    current: {
      title: "Modelo 211",
      description:
        "El comprador ingresa el 3 % de la contraprestación atribuible a no residentes.",
    },
    related: {
      title: "Modelo 210",
      description:
        "El vendedor no residente declara la ganancia o pérdida y descuenta la retención.",
      href: "/consultor-fiscal/modelos/210",
      label: "Ver Modelo 210",
    },
    additional: [
      {
        title: "Modelo 151",
        description:
          "Puede ser la declaración anual del vendedor acogido al régimen especial de desplazados.",
        href: "/consultor-fiscal/modelos/151",
        label: "Ver Modelo 151",
      },
      {
        title: "Modelo 216",
        description:
          "Se usa para otras retenciones periódicas de determinadas rentas pagadas a no residentes.",
        href: "/consultor-fiscal/modelos/216",
        label: "Ver Modelo 216",
      },
    ],
    conclusion:
      "El 211 es el pago a cuenta del comprador; el 210 o 151 determina después el resultado fiscal del vendedor.",
  },
  pdfNotice: [
    "La modalidad en papel se genera mediante la predeclaración oficial. La ficha incluye el PDF oficial de códigos de países y territorios como material auxiliar.",
  ],
  documents: [
    {
      label: "Códigos de países y territorios",
      sourceId: "aeat.irnr.country-codes-pdf.2014-06-04",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa del procedimiento",
      sourceId: "aeat.model-211.procedure-record.2026-06-09",
    },
    {
      label: "Ayuda de presentación electrónica",
      sourceId: "aeat.model-211.electronic-help.2026-06-19",
    },
    {
      label: "Ayuda de la predeclaración",
      sourceId: "aeat.model-211.paper-help.2026-02-10",
    },
    {
      label: "Instrucciones oficiales",
      sourceId: "aeat.model-211.instructions.2026-06-09",
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/3316/2010",
      sourceId: "boe.models-210-211-213.order-eha-3316-2010",
    },
    {
      label: "Orden HFP/1338/2023",
      sourceId: "boe.models-210-211-213.order-hfp-1338-2023",
    },
  ],
  faq: [
    {
      question: "¿Quién presenta el Modelo 211?",
      answer:
        "Quien compra un inmueble situado en España a una persona o entidad no residente sin establecimiento permanente.",
    },
    {
      question: "¿Cuánto se retiene?",
      answer:
        "El 3 % de la contraprestación atribuible a los vendedores no residentes.",
    },
    {
      question: "¿El 3 % se calcula sobre la ganancia?",
      answer:
        "No. Se calcula sobre la contraprestación; la ganancia o pérdida se determina después en la declaración del vendedor.",
    },
    {
      question: "¿Cuál es el plazo?",
      answer: "Un mes desde la fecha de transmisión del inmueble.",
    },
    {
      question: "¿Se presenta uno por escritura?",
      answer:
        "No necesariamente: se presenta un Modelo 211 por cada inmueble, aunque varios figuren en la misma escritura.",
    },
    {
      question: "¿Qué ocurre si hay varios compradores?",
      answer:
        "Se identifican y se informa de sus porcentajes, usando el anexo o mecanismo oficial cuando corresponda.",
    },
    {
      question: "¿Y si solo un vendedor es no residente?",
      answer:
        "La retención se aplica a la parte del precio atribuible a ese vendedor según su titularidad.",
    },
    {
      question: "¿El vendedor recibe una copia?",
      answer:
        "Sí. La necesita para acreditar el pago a cuenta en su Modelo 210 o declaración aplicable.",
    },
    {
      question: "¿Cuándo presenta el vendedor el Modelo 210?",
      answer:
        "En general, dentro de los tres meses posteriores al final del mes que tiene el comprador para presentar el 211.",
    },
    {
      question: "¿El 211 sustituye al ITP o al IVA?",
      answer:
        "No. Es una obligación independiente del IRNR y no sustituye los impuestos de la adquisición.",
    },
    {
      question: "¿Basta con una dirección española para no retener?",
      answer:
        "No. Debe comprobarse la residencia fiscal con prueba suficiente.",
    },
    {
      question: "¿Qué pasa si no se ingresa?",
      answer:
        "Puede haber responsabilidad del comprador y afección del inmueble, según la normativa aplicable.",
    },
  ],
  sourceIds: [
    "aeat.model-211.procedure-home.2026-07-02",
    "aeat.model-211.procedure-record.2026-06-09",
    "aeat.model-211.electronic-help.2026-06-19",
    "aeat.model-211.paper-help.2026-02-10",
    "aeat.model-211.instructions.2026-06-09",
    "aeat.irnr.country-codes-pdf.2014-06-04",
    "boe.models-210-211-213.order-eha-3316-2010",
    "boe.models-210-211-213.order-hfp-1338-2023",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
