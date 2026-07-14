import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "Esta guía se refiere al procedimiento de devolución del IVA soportado en un territorio diferente del de establecimiento. La Península y Baleares forman el territorio de aplicación del IVA español. Canarias, Ceuta y Melilla tienen particularidades específicas.";

export const MODEL_360_GUIDE_V1 = {
  code: "360",
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 360 permite a un autónomo o empresa establecido en España solicitar, a través de la Agencia Tributaria (AEAT), la devolución del Impuesto sobre el Valor Añadido (IVA) soportado en otro Estado miembro de la Unión Europea.",
    "La AEAT recibe y comprueba la solicitud antes de remitirla al país donde se pagó el impuesto. La decisión sobre la devolución corresponde a ese Estado. Algunas páginas oficiales denominan este trámite «Formulario 360».",
    TERRITORIAL_NOTE,
  ],
  notices: [
    {
      title: "No recupera IVA español",
      paragraphs: [
        "El IVA español se deduce o solicita mediante los procedimientos nacionales que correspondan. El IVA de otro Estado no se introduce como cuota deducible española en el Modelo 303.",
      ],
    },
    {
      title: "Una factura incorrecta se rectifica primero",
      paragraphs: [
        "Si el proveedor repercutió IVA extranjero cuando no procedía, la vía habitual es pedirle una factura rectificativa. El Modelo 360 no corrige una factura mal emitida.",
      ],
    },
    {
      title: "La devolución no está garantizada",
      paragraphs: [
        "Cada Estado aplica sus propias limitaciones de deducción. Hoteles, comidas, vehículos, combustible u otros gastos pueden estar limitados o excluidos aunque sean profesionales.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si corresponde el Modelo 360",
      href: "https://sede.agenciatributaria.gob.es/Sede/no-residentes/iva-empresarios-profesionales-no-establecidos/devoluciones-iva-no-establecidos/solicitudes-empresarios-espanoles-otros-estados-ue.html",
      primary: true,
    },
    {
      label: "Abrir la página oficial de los Modelos 360 y 361",
      sourceId: "aeat.models-360-361.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar periodos, mínimos y plazo",
      href: "https://sede.agenciatributaria.gob.es/Sede/no-residentes/iva-empresarios-profesionales-no-establecidos/devoluciones-iva-no-establecidos/periodo-cuantia-plazo-solicitud.html",
    },
    {
      label: "Consultar la ayuda del formulario",
      sourceId: "aeat.model-360.browser-help.2026-01-09",
    },
    {
      label: "Consultar la presentación mediante fichero",
      sourceId: "aeat.model-360.file-help.2026-01-09",
    },
  ],
  quickSummaryTitle: "El Modelo 360 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value: "Una solicitud de devolución de IVA extranjero.",
    },
    {
      label: "Quién lo utiliza",
      value:
        "Empresarios y profesionales establecidos en España, incluidos ciertos supuestos de Canarias, Ceuta y Melilla.",
    },
    {
      label: "Presentación",
      value: "Electrónica, con certificado electrónico.",
    },
    {
      label: "Quién decide",
      value: "La Administración del Estado donde se soportó el IVA.",
    },
    {
      label: "Periodo",
      value:
        "Entre tres meses y un año; el resto del año puede ser inferior a tres meses.",
    },
    {
      label: "Mínimo",
      value:
        "400 € para periodos inferiores al año; 50 € para el año completo o su parte restante.",
    },
    { label: "Fecha límite", value: "30 de septiembre del año siguiente." },
    {
      label: "Resolución",
      value:
        "Habitualmente cuatro meses; hasta ocho si se pide información adicional.",
    },
  ],
  sections: [
    {
      id: "model-360-decision",
      title: "¿Cuándo puede corresponder?",
      cards: [
        {
          title: "Viaje profesional en la UE",
          paragraphs: [
            "El IVA de un hotel, feria, congreso, peaje, combustible o alquiler de vehículo puede solicitarse si el gasto está vinculado a la actividad y el país permite su deducción.",
          ],
        },
        {
          title: "Servicios o equipos locales",
          paragraphs: [
            "También puede afectar a servicios profesionales locales, alquiler de espacios, maquinaria, equipos o importaciones realizadas en otro Estado miembro.",
          ],
        },
        {
          title: "Factura con IVA indebido",
          paragraphs: [
            "Si una factura francesa o alemana debía emitirse sin IVA por inversión del sujeto pasivo, debe pedirse su rectificación antes de plantear el 360.",
          ],
        },
        {
          title: "Gasto particular o sin derecho",
          paragraphs: [
            "No se incluyen compras privadas, gastos ajenos a la actividad ni la parte que no resulte deducible por la naturaleza de la operación o por la prorrata aplicable.",
          ],
        },
      ],
      note: "Estos ejemplos orientan, pero no sustituyen las reglas del Estado de devolución ni garantizan que el gasto sea recuperable.",
    },
    {
      id: "model-360-requirements",
      title: "Requisitos del solicitante",
      cards: [
        {
          title: "Condición empresarial",
          bullets: [
            "Actuar como empresario o profesional.",
            "Disponer de NIF y estar correctamente censado.",
            "Destinar el gasto a operaciones que originan derecho a deducción.",
          ],
        },
        {
          title: "Situación en el país de devolución",
          bullets: [
            "No realizar allí operaciones que excluyan este procedimiento, salvo las excepciones previstas.",
            "Cumplir los requisitos y restricciones del país que debe devolver.",
          ],
        },
        {
          title: "Derecho parcial",
          paragraphs: [
            "Si la actividad no permite deducir todo el IVA, se indica el porcentaje que corresponda. No debe solicitarse automáticamente el 100 %.",
          ],
        },
        {
          title: "Filtro de la AEAT",
          paragraphs: [
            "La AEAT puede no remitir la solicitud si no existe condición de empresario, solo hay operaciones sin derecho completo a deducción o se desarrollan únicamente ciertas actividades en regímenes especiales.",
          ],
        },
      ],
    },
    {
      id: "model-360-country-period",
      title: "País, periodo e importes mínimos",
      cards: [
        {
          title: "Una solicitud por Estado",
          paragraphs: [
            "El IVA francés se solicita a Francia y el alemán a Alemania. No se mezclan varios países en la misma solicitud.",
          ],
        },
        {
          title: "Periodo válido",
          paragraphs: [
            "Puede abarcar de tres meses a un año natural. Un periodo inferior a tres meses solo es válido cuando constituye la parte restante del año. Nunca mezcla dos años.",
          ],
        },
        {
          title: "Mínimo de 400 €",
          paragraphs: [
            "Se aplica cuando el periodo es inferior al año y tiene al menos tres meses. El mínimo se refiere al IVA solicitado, no al total de las facturas.",
          ],
        },
        {
          title: "Mínimo de 50 €",
          paragraphs: [
            "Se aplica a la solicitud del año natural completo o de la parte restante del año.",
          ],
        },
      ],
      note: "Una solicitud de enero a marzo por 250 € no alcanza el mínimo. Una solicitud anual por 70 € sí puede alcanzarlo.",
    },
    {
      id: "model-360-deadline-omissions",
      title: "Plazo y facturas olvidadas",
      cards: [
        {
          title: "30 de septiembre",
          paragraphs: [
            "La solicitud puede presentarse después de finalizar el periodo y hasta el 30 de septiembre del año siguiente a aquel en que se soportó el IVA.",
          ],
        },
        {
          title: "Ejemplo ilustrativo",
          paragraphs: [
            "Para IVA soportado durante 2026, la fecha límite general es el 30 de septiembre de 2027. El acceso de la ficha no fija un ejercicio permanente.",
          ],
        },
        {
          title: "Factura omitida",
          paragraphs: [
            "Tras presentar una solicitud de un periodo, una factura olvidada no se añade sin más a otro trimestre. Debe incorporarse a una nueva solicitud de carácter anual conforme al procedimiento.",
          ],
        },
        {
          title: "Sin concesión automática",
          paragraphs: [
            "El plazo ordinario de decisión es de cuatro meses y puede ampliarse hasta ocho con requerimientos. El silencio no se presenta aquí como una devolución concedida.",
          ],
        },
      ],
    },
    {
      id: "model-360-documents",
      title: "Información que conviene preparar",
      cards: [
        {
          title: "Identificación y cuenta",
          bullets: [
            "NIF y certificado electrónico.",
            "Actividad y porcentaje de deducción.",
            "IBAN, BIC y titular de la cuenta.",
            "Poder de representación cuando proceda.",
          ],
        },
        {
          title: "Facturas e importaciones",
          bullets: [
            "Proveedor e identificador fiscal.",
            "Número y fecha.",
            "Base, IVA soportado e importe solicitado.",
            "Documento de importación, cuando corresponda.",
          ],
        },
        {
          title: "Clasificación del gasto",
          bullets: [
            "Naturaleza del bien o servicio.",
            "Código oficial aplicable.",
            "País y periodo correctos.",
            "Documentación adicional exigida por ese Estado.",
          ],
        },
        {
          title: "Conservación",
          paragraphs: [
            "Guarda facturas, justificantes, requerimientos, respuestas y resolución. Esta ficha no almacena documentos ni datos bancarios.",
          ],
        },
      ],
    },
    {
      id: "model-360-related",
      title: "Diferencias con otros modelos",
      cards: [
        {
          title: "Modelo 303",
          paragraphs: ["Declara el IVA español periódico."],
          links: [
            { label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" },
          ],
        },
        {
          title: "Modelo 349",
          paragraphs: [
            "Informa de determinadas operaciones intracomunitarias B2B; no solicita devoluciones.",
          ],
          links: [
            { label: "Ver Modelo 349", href: "/consultor-fiscal/modelos/349" },
          ],
        },
        {
          title: "Modelo 361",
          paragraphs: [
            "Solicita IVA español para determinados empresarios establecidos fuera de la UE.",
          ],
          links: [
            { label: "Ver Modelo 361", href: "/consultor-fiscal/modelos/361" },
          ],
        },
        {
          title: "Factura rectificativa",
          paragraphs: [
            "Es la vía para corregir IVA extranjero repercutido indebidamente por el proveedor.",
          ],
        },
      ],
    },
    {
      id: "model-360-mistakes",
      title: "Errores habituales",
      accordions: [
        {
          question: "Errores de impuesto o país",
          paragraphs: [
            "Introducir IVA extranjero en el 303, mezclar Estados o pedir mediante el 360 la devolución de IVA facturado indebidamente.",
          ],
        },
        {
          question: "Errores de periodo o mínimo",
          paragraphs: [
            "Mezclar ejercicios, solicitar menos de tres meses sin ser el final del año, no alcanzar 400/50 € o presentar después del 30 de septiembre.",
          ],
        },
        {
          question: "Errores de derecho a deducción",
          paragraphs: [
            "Incluir gastos particulares, solicitar el 100 % con prorrata o asumir que cualquier hotel, combustible o vehículo es deducible.",
          ],
        },
        {
          question: "Errores documentales",
          paragraphs: [
            "Omitir códigos, facturas, documentos del país o datos bancarios; o creer que el justificante de envío garantiza el cobro.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 360",
  fillingSteps: [
    {
      title: "1. Identificar al solicitante",
      paragraphs: [
        "Consigna NIF, nombre o razón social, domicilio, contacto y actividad.",
      ],
    },
    {
      title: "2. Elegir Estado y periodo",
      paragraphs: [
        "Selecciona el país donde se soportó el IVA y un intervalo válido dentro del mismo año natural.",
      ],
    },
    {
      title: "3. Indicar deducción y cuenta",
      paragraphs: [
        "Declara el porcentaje aplicable y revisa titular, IBAN y BIC.",
      ],
    },
    {
      title: "4. Incorporar facturas",
      paragraphs: [
        "Añade proveedor, identificación, número, fecha, base, IVA, importe pedido, naturaleza e información adicional.",
      ],
    },
    {
      title: "5. Incorporar importaciones y anexos",
      paragraphs: [
        "Registra separadamente documentos de importación y adjunta lo exigido por el Estado de devolución.",
      ],
    },
    {
      title: "6. Validar, firmar y conservar",
      paragraphs: [
        "Corrige errores, firma electrónicamente y guarda justificante, número de registro y Código Seguro de Verificación (CSV).",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "1. Comprobación española",
      description:
        "La AEAT comprueba los requisitos básicos y puede no remitir la solicitud.",
    },
    {
      title: "2. Remisión al Estado",
      description:
        "Si procede, la AEAT la envía al país donde se soportó el IVA.",
    },
    {
      title: "3. Revisión extranjera",
      description:
        "Ese Estado puede pedir información, aceptar, conceder parcialmente o denegar.",
    },
    {
      title: "4. Resolución y recurso",
      description:
        "La decisión y los recursos siguen las reglas del Estado de devolución; frente a una no remisión de la AEAT puede existir recurso en España.",
    },
  ],
  comparison: {
    title: "Modelo 360, Modelo 361 y Modelo 303",
    current: {
      title: "Modelo 360",
      description:
        "Solicita IVA soportado en otro Estado miembro por un empresario establecido en España.",
    },
    related: {
      title: "Modelo 361",
      description:
        "Solicita IVA español por determinados empresarios establecidos fuera de la Unión Europea.",
      href: "/consultor-fiscal/modelos/361",
      label: "Ver Modelo 361",
    },
    additional: [
      {
        title: "Modelo 303",
        description: "Declara y deduce, cuando procede, IVA español.",
        href: "/consultor-fiscal/modelos/303",
        label: "Ver Modelo 303",
      },
    ],
    conclusion:
      "El territorio donde se soportó el IVA y el lugar de establecimiento determinan el procedimiento; una factura extranjera no debe clasificarse solo por el país del proveedor.",
  },
  pdfNotice: [
    "Las instrucciones y guías oficiales ayudan a preparar la solicitud, pero no acreditan que el IVA sea recuperable.",
    "Los trámites se realizan en sedes oficiales externas. Factu no firma, presenta ni envía solicitudes.",
  ],
  documents: [
    {
      label: "Descargar instrucciones oficiales del Modelo 360",
      sourceId: "aeat.model-360.instructions-pdf.captured-2026-07-13",
    },
    {
      label: "Descargar guía oficial del formulario",
      sourceId: "aeat.model-360.guide-pdf.captured-2026-07-13",
    },
    {
      label: "Consultar diseño de registro",
      sourceId: "aeat.model-360.register-design-pdf.captured-2026-07-13",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa de los Modelos 360 y 361",
      sourceId: "aeat.models-360-361.procedure-record.2026-06-09",
    },
    {
      label: "Instrucciones del Modelo 360",
      sourceId: "aeat.model-360.instructions.2026-06-09",
    },
    {
      label: "Guía oficial de presentación",
      sourceId: "aeat.model-360.guide-page.2026-06-09",
    },
    {
      label: "Consultar el plazo de resolución",
      href: "https://sede.agenciatributaria.gob.es/Sede/no-residentes/iva-empresarios-profesionales-no-establecidos/devoluciones-iva-no-establecidos/plazo-resolver-solicitud.html",
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/789/2010",
      sourceId: "boe.models-360-361.order-eha-789-2010.original",
    },
    {
      label: "Ley 37/1992 del IVA",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    },
    {
      label: "Reglamento del IVA",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925",
    },
  ],
  faq: [
    {
      question: "¿Sirve para recuperar IVA español?",
      answer: "No. El 360 se dirige al IVA soportado en otro Estado miembro.",
    },
    {
      question: "¿Puedo recuperar IVA pagado en Francia o Alemania?",
      answer:
        "Puede solicitarse si se cumplen los requisitos y limitaciones del país correspondiente.",
    },
    {
      question: "¿Puedo incluir varios países?",
      answer: "No. Debe presentarse una solicitud separada por Estado.",
    },
    {
      question: "¿Qué importes mínimos existen?",
      answer:
        "400 € para un periodo inferior al año y 50 € para el año completo o la parte restante del año.",
    },
    {
      question: "¿Cuál es la fecha límite?",
      answer:
        "El 30 de septiembre del año siguiente a aquel en que se soportó el IVA.",
    },
    {
      question: "¿Puede incluirse un solo mes?",
      answer:
        "Solo cuando ese mes constituye la parte restante del año natural.",
    },
    {
      question: "¿Qué hago si el proveedor cobró IVA por error?",
      answer: "Solicita primero una factura rectificativa al proveedor.",
    },
    {
      question: "¿Puedo incluir hoteles o combustible?",
      answer:
        "Depende de las reglas de deducción del Estado que debe devolver.",
    },
    {
      question: "¿Quién decide la devolución?",
      answer: "La Administración del país en el que se soportó el IVA.",
    },
    {
      question: "¿Cuánto tarda?",
      answer:
        "El plazo ordinario es de cuatro meses y puede alcanzar ocho cuando se solicita información adicional.",
    },
    {
      question: "¿Puede presentarlo mi asesor?",
      answer:
        "Sí, mediante una representación admitida para la presentación electrónica.",
    },
    {
      question: "¿La AEAT puede no enviarlo?",
      answer:
        "Sí, si no se cumplen los requisitos españoles para remitir la solicitud.",
    },
    {
      question: "¿Qué ocurre con una factura olvidada?",
      answer:
        "Debe incorporarse a una nueva solicitud anual conforme a las reglas del procedimiento.",
    },
    {
      question: "¿Puedo solicitar el 100 % si aplico prorrata?",
      answer:
        "No automáticamente; debe indicarse el porcentaje de deducción que corresponda.",
    },
    {
      question: "¿El justificante garantiza el cobro?",
      answer:
        "No. Solo acredita la presentación; el Estado de devolución decide sobre el fondo.",
    },
  ],
  sourceIds: [
    "aeat.models-360-361.procedure-home.2026-06-09",
    "aeat.models-360-361.procedure-record.2026-06-09",
    "aeat.model-360.instructions.2026-06-09",
    "aeat.model-360.browser-help.2026-01-09",
    "aeat.model-360.file-help.2026-01-09",
    "aeat.model-360.guide-page.2026-06-09",
    "aeat.model-360.instructions-pdf.captured-2026-07-13",
    "aeat.model-360.guide-pdf.captured-2026-07-13",
    "aeat.model-360.register-design-pdf.captured-2026-07-13",
    "boe.models-360-361.order-eha-789-2010.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
