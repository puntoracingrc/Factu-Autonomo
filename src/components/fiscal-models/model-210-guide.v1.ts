import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const TERRITORIAL_NOTE =
  "La guía se refiere al IRNR estatal. Cuando un inmueble o una renta se conecte con País Vasco o Navarra, debe comprobarse la competencia foral.";

export const MODEL_210_GUIDE_V1 = {
  code: "210",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "Los enlaces conducen a la AEAT o al BOE. Esta ficha no determina la residencia, no calcula el impuesto y no presenta, paga ni almacena la declaración.",
  intro: [
    "El Modelo 210 declara determinadas rentas obtenidas en España por personas o entidades no residentes sin establecimiento permanente.",
    "No existe un único plazo ni un único cálculo: dependen del tipo de renta, la fecha de devengo, el resultado y, desde 2026, de las reglas transitorias aprobadas por la Orden HAC/623/2026. La residencia fiscal no se presume por nacionalidad, NIE, domicilio o cuenta bancaria.",
  ],
  notices: [
    {
      title: "Primero debe acreditarse la residencia",
      paragraphs: [
        "Cuando se pretenda aplicar un convenio o una exención, suele ser necesario un certificado de residencia fiscal vigente expedido por la autoridad competente del otro país.",
      ],
    },
    {
      title: "No siempre hay que presentar",
      paragraphs: [
        "Determinadas rentas sometidas a la retención correcta pueden no requerir Modelo 210. Existen excepciones importantes, como inmuebles, transmisiones, rentas sin retención suficiente o solicitudes de devolución.",
      ],
    },
    { title: "Ámbito territorial", paragraphs: [TERRITORIAL_NOTE] },
  ],
  actions: [
    {
      label: "Abrir las gestiones oficiales del Modelo 210",
      sourceId: "aeat.model-210.procedure-home.2026-07-02",
      primary: true,
    },
    {
      label: "Consultar la nota de nuevos plazos",
      sourceId: "aeat.model-210.order-hac-623-note.2026-07-02",
      primary: true,
    },
    {
      label: "Leer las instrucciones oficiales",
      sourceId: "aeat.model-210.instructions.2026-07-02",
    },
    {
      label: "Ver la retención inmobiliaria Modelo 211",
      internalHref: "/consultor-fiscal/modelos/211",
    },
  ],
  quickSummaryTitle: "El Modelo 210 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value:
        "La declaración ordinaria del IRNR sin establecimiento permanente.",
    },
    {
      label: "Quién lo presenta",
      value:
        "La persona no residente, su representante o, en determinados supuestos, responsables o retenedores.",
    },
    {
      label: "Rentas habituales",
      value:
        "Inmuebles de uso propio, alquileres, transmisiones, intereses, dividendos y otras rentas españolas.",
    },
    {
      label: "Periodicidad",
      value:
        "No es periódica en general; el plazo depende de la renta, devengo y resultado.",
    },
    {
      label: "Tipos orientativos",
      value:
        "Con carácter general pueden aparecer 19 % o 24 %, pero el tipo exacto depende de renta, residencia, fecha y convenio.",
    },
    {
      label: "Presentación",
      value:
        "Formulario web, fichero .210 o predeclaración cuando la AEAT lo admite.",
    },
  ],
  sections: [
    {
      id: "model-210-filing",
      title: "Cuándo existe obligación de declarar",
      cards: [
        {
          title: "Renta con retención correcta",
          paragraphs: [
            "Con carácter general no se presenta por rentas ya sometidas a la retención o ingreso a cuenta que corresponda, salvo que la norma exija declarar o se solicite una devolución.",
          ],
        },
        {
          title: "Casos que suelen requerirlo",
          bullets: [
            "Renta imputada de inmuebles urbanos de uso propio o vacíos.",
            "Alquileres sin retención suficiente.",
            "Ganancia o pérdida en la venta de un inmueble.",
            "Rentas pagadas por quien no está obligado a retener.",
            "Diferencia entre retención practicada y cuota, o solicitud de devolución.",
          ],
        },
      ],
      note: "Una retención visible en un justificante no prueba por sí sola que sea correcta ni que elimine la declaración.",
    },
    {
      id: "model-210-income-types",
      title: "Tipos de renta más frecuentes",
      cards: [
        {
          title: "Inmueble de uso propio",
          paragraphs: [
            "La persona física no residente puede declarar una renta imputada por el inmueble urbano no alquilado, proporcional a los días de titularidad y uso.",
          ],
        },
        {
          title: "Alquiler",
          paragraphs: [
            "Se declara el rendimiento del inmueble. Para residentes de determinados Estados de la Unión Europea o del Espacio Económico Europeo con intercambio efectivo pueden admitirse gastos directamente relacionados y acreditados; en otros casos la referencia general parte del importe íntegro, sin perjuicio de la ley y del convenio vigentes. No debe copiarse automáticamente el régimen del IRPF.",
          ],
        },
        {
          title: "Venta de inmueble",
          paragraphs: [
            "Se declara la ganancia o pérdida. El comprador presenta el Modelo 211 e ingresa el 3 % del precio atribuible a vendedores no residentes.",
          ],
        },
        {
          title: "Otras rentas",
          paragraphs: [
            "Servicios, dividendos, intereses, cánones, trabajo, pensiones o ganancias tienen reglas propias, posibles retenciones y convenios que deben revisarse individualmente.",
          ],
        },
      ],
    },
    {
      id: "model-210-rates",
      title: "Tipos y convenios",
      cards: [
        {
          title: "Referencia del 19 %",
          paragraphs: [
            "Puede corresponder, entre otros casos, a determinados residentes de la Unión Europea, Islandia, Noruega o Liechtenstein en los términos oficiales, y a ciertas rentas del ahorro.",
          ],
        },
        {
          title: "Referencia general del 24 %",
          paragraphs: [
            "Puede aplicarse a otros contribuyentes en rentas sujetas a la regla general, salvo especialidad o convenio.",
          ],
        },
        {
          title: "Convenio para evitar la doble imposición",
          paragraphs: [
            "Puede limitar el tipo o atribuir la potestad tributaria. Para aplicarlo debe identificarse el artículo correcto y conservar un certificado de residencia fiscal válido.",
          ],
        },
      ],
      note: "Los porcentajes son orientación educativa, no un cálculo. Fecha, país, naturaleza de la renta y convenio pueden cambiar el resultado.",
    },
    {
      id: "model-210-separate-grouped",
      title: "Declaraciones separadas y agrupadas",
      cards: [
        {
          title: "Regla general",
          paragraphs: [
            "Se presenta una declaración por cada tipo de renta y devengo. No se compensan automáticamente resultados positivos y negativos de operaciones diferentes.",
          ],
        },
        {
          title: "Agrupación",
          paragraphs: [
            "Solo se agrupan rentas cuando cumplen las condiciones oficiales de código de renta, pagador, tipo y bien o derecho. Los alquileres admiten una agrupación específica identificada por el código de renta correspondiente.",
          ],
        },
        {
          title: "Varios titulares",
          paragraphs: [
            "Cada contribuyente declara su porcentaje. No debe multiplicarse el valor total del inmueble por cada titular.",
          ],
        },
      ],
    },
    {
      id: "model-210-deadlines-2026",
      title: "Plazos y transición 2026–2027",
      intro: [
        "La Orden HAC/623/2026 modifica los plazos. La fecha de devengo y si las rentas se agrupan son decisivas.",
      ],
      cards: [
        {
          title: "Renta imputada de 2025",
          paragraphs: [
            "Se declara del 1 de enero al 31 de diciembre de 2026, sin aplicar todavía el nuevo inicio de abril.",
          ],
        },
        {
          title: "Renta imputada de 2026",
          paragraphs: [
            "Se declara del 1 de abril al 31 de diciembre de 2027. La domiciliación se extiende, con carácter general, hasta el 23 de diciembre.",
          ],
        },
        {
          title: "Alquileres de 2026 agrupados",
          paragraphs: [
            "Las rentas agrupadas del año 2026 se presentan del 1 al 20 de abril de 2027.",
          ],
        },
        {
          title: "Alquileres separados",
          bullets: [
            "Devengos de abril a junio de 2026: plazo antiguo de julio de 2026.",
            "Devengos de julio a septiembre de 2026: plazo antiguo de octubre de 2026.",
            "Devengos de octubre a diciembre de 2026: del 1 al 20 de abril de 2027.",
          ],
        },
        {
          title: "Nuevo formulario",
          paragraphs: [
            "Los nuevos campos y estructura derivados de la orden se aplican a declaraciones presentadas desde el 1 de enero de 2027.",
          ],
        },
      ],
      note: "No conviertas esta transición en una regla permanente. Para devengos posteriores debe consultarse la versión vigente de la AEAT.",
    },
    {
      id: "model-210-other-deadlines",
      title: "Otros plazos relevantes",
      cards: [
        {
          title: "Venta de inmueble",
          paragraphs: [
            "Tres meses una vez transcurrido el mes que tiene el comprador para presentar el Modelo 211.",
          ],
        },
        {
          title: "Resultado cero",
          paragraphs: [
            "Del 1 al 20 de enero del año siguiente al devengo, conforme a las instrucciones oficiales.",
          ],
        },
        {
          title: "Resultado a devolver",
          paragraphs: [
            "Desde el 1 de febrero del año siguiente al devengo y dentro del plazo de cuatro años.",
          ],
        },
        {
          title: "Otros resultados a ingresar",
          paragraphs: [
            "Se atiende al calendario y a la regla específica del tipo de renta y devengo; la domiciliación puede cerrar antes.",
          ],
        },
      ],
    },
    {
      id: "model-210-property-sale",
      title: "Venta de un inmueble",
      cards: [
        {
          title: "Retención del comprador",
          paragraphs: [
            "El comprador ingresa mediante el Modelo 211 el 3 % de la contraprestación correspondiente a vendedores no residentes y entrega una copia al transmitente.",
          ],
        },
        {
          title: "Declaración del vendedor",
          paragraphs: [
            "El vendedor presenta el Modelo 210 por la ganancia o pérdida e incorpora la retención soportada. Si procede, puede resultar una cantidad a devolver.",
          ],
        },
        {
          title: "Documentación",
          bullets: [
            "Escritura de compra y de venta.",
            "Gastos e inversiones acreditados.",
            "Copia del Modelo 211 y justificante del 3 %.",
            "Certificado de residencia fiscal y convenio cuando sean relevantes.",
          ],
        },
      ],
    },
  ],
  fillingTitle: "Cómo preparar el Modelo 210",
  fillingSteps: [
    {
      title: "1. Acredita contribuyente y residencia",
      paragraphs: [
        "Identifica titular, país, porcentaje de propiedad y certificado fiscal; no deduzcas la residencia del NIE.",
      ],
    },
    {
      title: "2. Clasifica la renta y el devengo",
      paragraphs: [
        "Distingue imputación, alquiler, venta u otra renta y anota la fecha exacta.",
      ],
    },
    {
      title: "3. Revisa convenio, retención y tipo",
      paragraphs: [
        "Comprueba la regla interna, el convenio y los justificantes antes de aplicar un porcentaje.",
      ],
    },
    {
      title: "4. Decide si se declara separada o agrupada",
      paragraphs: [
        "Agrupa solo si se cumplen todas las condiciones oficiales; no compenses operaciones distintas.",
      ],
    },
    {
      title: "5. Aplica el plazo correcto y conserva el envío",
      paragraphs: [
        "Distingue la transición 2026–2027, valida el formulario y guarda justificante, NRC o solicitud de devolución.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Justificante",
      description:
        "Conserva la respuesta oficial y cualquier referencia de pago o devolución.",
    },
    {
      title: "Requerimientos",
      description:
        "Responde por el canal oficial y aporta solo la documentación solicitada.",
    },
    {
      title: "Siguiente devengo",
      description:
        "No reutilices automáticamente plazo, tipo o certificado; vuelve a comprobarlos.",
    },
  ],
  comparison: {
    title: "Modelos relacionados con no residentes",
    current: {
      title: "Modelo 210",
      description:
        "Declara la renta del contribuyente no residente sin establecimiento permanente.",
    },
    related: {
      title: "Modelo 211",
      description:
        "El comprador ingresa el 3 % al adquirir un inmueble a un no residente.",
      href: "/consultor-fiscal/modelos/211",
      label: "Ver Modelo 211",
    },
    additional: [
      {
        title: "Modelo 216",
        description:
          "El pagador ingresa determinadas retenciones practicadas a no residentes.",
        href: "/consultor-fiscal/modelos/216",
        label: "Ver Modelo 216",
      },
      {
        title: "Modelo 151",
        description:
          "Declaración anual del régimen especial de personas desplazadas residentes en España.",
        href: "/consultor-fiscal/modelos/151",
        label: "Ver Modelo 151",
      },
    ],
    conclusion:
      "El 210 pertenece al contribuyente; el 211 al comprador del inmueble; el 216 al pagador que retiene.",
  },
  pdfNotice: [
    "La modalidad en papel se genera como predeclaración desde el navegador; no es un impreso vacío universal. La ficha oficial incluye además un PDF de códigos de países y territorios.",
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
      sourceId: "aeat.model-210.procedure-record.2026-07-02",
    },
    {
      label: "Ayuda de presentación electrónica",
      sourceId: "aeat.model-210.electronic-help.2026-07-02",
    },
    {
      label: "Ayuda de la predeclaración",
      sourceId: "aeat.model-210.paper-help.2026-07-02",
    },
    {
      label: "Ejemplos oficiales",
      sourceId: "aeat.model-210.examples.2026-06-24",
    },
    {
      label: "Formas de presentación y pago",
      sourceId: "aeat.model-210.presentation-info.2026-07-09",
    },
  ],
  legalLinks: [
    {
      label: "Orden EHA/3316/2010",
      sourceId: "boe.models-210-211-213.order-eha-3316-2010",
    },
    {
      label: "Orden HAC/623/2026",
      sourceId: "boe.models-210-213.order-hac-623-2026",
    },
  ],
  faq: [
    {
      question: "¿Quién presenta el Modelo 210?",
      answer:
        "La persona o entidad no residente sin establecimiento permanente por una renta sujeta que deba declarar, directamente o mediante quien esté legitimado.",
    },
    {
      question: "¿Debo presentarlo si ya me practicaron retención?",
      answer:
        "No siempre. Si la retención es correcta puede no existir obligación, pero hay excepciones y puede ser necesario solicitar devolución.",
    },
    {
      question: "¿Sirve para un inmueble no alquilado?",
      answer:
        "Sí, una persona física no residente puede tener que declarar renta imputada por un inmueble urbano de uso propio o vacío.",
    },
    {
      question: "¿Sirve para alquileres?",
      answer:
        "Sí, cuando corresponde declarar el rendimiento del inmueble en España.",
    },
    {
      question: "¿Qué tipo se aplica, 19 % o 24 %?",
      answer:
        "Depende de la renta, residencia, fecha y convenio. No debe elegirse solo por la nacionalidad.",
    },
    {
      question: "¿Puedo agrupar varios alquileres?",
      answer:
        "Solo cuando se cumplen las condiciones oficiales; no se mezclan libremente inmuebles, tipos o periodos.",
    },
    {
      question: "¿Cuándo declaro la imputación de 2025?",
      answer: "Del 1 de enero al 31 de diciembre de 2026.",
    },
    {
      question: "¿Cuándo declaro la imputación de 2026?",
      answer:
        "Del 1 de abril al 31 de diciembre de 2027, conforme al nuevo régimen de plazos.",
    },
    {
      question: "¿Cuándo se presentan alquileres agrupados de 2026?",
      answer: "Del 1 al 20 de abril de 2027.",
    },
    {
      question: "¿Cuál es el plazo tras vender un inmueble?",
      answer:
        "Tres meses después de finalizar el mes concedido al comprador para presentar el Modelo 211.",
    },
    {
      question: "¿Cuándo pido una devolución?",
      answer:
        "Desde el 1 de febrero del año siguiente al devengo y dentro de cuatro años, con la documentación correspondiente.",
    },
    {
      question: "¿El NIE demuestra que soy residente fiscal?",
      answer:
        "No. La residencia se acredita y analiza conforme a la ley y al convenio aplicable.",
    },
  ],
  sourceIds: [
    "aeat.model-210.procedure-home.2026-07-02",
    "aeat.model-210.procedure-record.2026-07-02",
    "aeat.model-210.electronic-help.2026-07-02",
    "aeat.model-210.paper-help.2026-07-02",
    "aeat.model-210.instructions.2026-07-02",
    "aeat.model-210.order-hac-623-note.2026-07-02",
    "aeat.model-210.examples.2026-06-24",
    "aeat.model-210.presentation-info.2026-07-09",
    "aeat.irnr.country-codes-pdf.2014-06-04",
    "boe.models-210-211-213.order-eha-3316-2010",
    "boe.models-210-213.order-hac-623-2026",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
