import { createBatch5PracticalGuideV1 } from "./create-batch-5-practical-guide.v1";

const CATEGORY = "Tributos patrimoniales, tasas y obligaciones sectoriales";

export const MODEL_695_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "695",
  category: CATEGORY,
  statusLabel: "Solicitud de devolución parcial",
  statusTone: "auxiliary",
  intro: [
    "El Modelo 695 solicita la devolución parcial de una tasa judicial pagada mediante el Modelo 696 cuando el proceso termina en determinados supuestos legales o se acumulan procesos.",
    "No devuelve automáticamente toda la tasa: exige identificar el pago previo y aportar resolución firme o certificación judicial.",
  ],
  notices: [
    {
      title: "Porcentajes limitados y sin intereses",
      paragraphs: [
        "La devolución es del 60 % en determinados supuestos de allanamiento total, acuerdo o reconocimiento que pone fin al litigio, y del 20 % por acumulación de procesos. Estas devoluciones no generan intereses de demora.",
      ],
    },
  ],
  type: "Solicitud de devolución",
  presenter:
    "El sujeto que pagó el Modelo 696 y acredita uno de los supuestos legales de devolución parcial.",
  nonPresenter:
    "Quien no pagó la tasa, no dispone de la resolución/certificación necesaria o reclama un simple error de cálculo por esta vía.",
  periodicity:
    "No periódica; nace cuando existe el supuesto procesal y la resolución/certificación exigida.",
  deadline:
    "Debe revisarse desde la firmeza o certificación del supuesto concreto; no se presume un plazo periódico.",
  channel:
    "Solicitud electrónica o predeclaración cuando esté habilitada, con justificante 696, resolución y cuenta para devolución.",
  result:
    "Devolución del 60 % o 20 %, concesión parcial o denegación; la solicitud no garantiza el abono.",
  included: [
    "Allanamiento total o acuerdo que pone fin al litigio en los casos legales.",
    "Reconocimiento total por la Administración cuando corresponda.",
    "Acumulación de procesos acordada judicialmente.",
  ],
  excluded: [
    "Devolución íntegra automática.",
    "Ingreso indebido por haber calculado mal la tasa, que puede exigir rectificación.",
    "Procesos sin resolución firme o certificación exigible.",
  ],
  preparation: [
    "Número de justificante y NRC del Modelo 696.",
    "Resolución firme o certificación judicial.",
    "Identificación, representación y cuenta bancaria.",
  ],
  commonMistakes: [
    "Solicitar el 100 %.",
    "Confundir acumulación con terminación del litigio.",
    "No aportar la resolución/certificación.",
  ],
  correction:
    "Subsanar la solicitud o aportar documentación si es requerido; para un ingreso indebido por error en la cuota, utiliza el procedimiento de rectificación que corresponda.",
  procedureSourceId: "aeat.model-695.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-695.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-695.instructions.2026-07-14",
  legalSourceIds: [
    "boe.order-hap-2662-2012.consolidated.2026-07-14",
    "boe.order-hap-861-2015.consolidated.2026-07-14",
  ],
  related: [
    {
      code: "696",
      href: "/consultor-fiscal/modelos/696",
      description:
        "Autoliquidación de la tasa judicial que debe haberse pagado previamente.",
    },
  ],
  specificFaq: [
    {
      question: "¿Cuándo corresponde el 60 %?",
      answer:
        "En determinados supuestos legales de allanamiento total, acuerdo o reconocimiento que pone fin al litigio, acreditados por resolución firme.",
    },
    {
      question: "¿Cuándo corresponde el 20 %?",
      answer:
        "Cuando se acuerda judicialmente la acumulación de procesos y se aporta la certificación correspondiente.",
    },
    {
      question: "¿Se pagan intereses?",
      answer:
        "No, estas devoluciones parciales no generan intereses de demora.",
    },
  ],
});

export const MODEL_696_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "696",
  category: CATEGORY,
  statusLabel: "Tasa judicial · revisar exenciones",
  statusTone: "current",
  intro: [
    "El Modelo 696 autoliquida la tasa judicial que determinadas personas jurídicas deben satisfacer antes de ciertos actos procesales civiles, contencioso-administrativos o sociales.",
    "Las personas físicas están exentas y existen otras exenciones subjetivas/objetivas; la STC 140/2016 anuló partes importantes del diseño original.",
  ],
  notices: [
    {
      title: "No reutilices una tabla histórica",
      paragraphs: [
        "La cuota fija y los hechos imponibles vigentes deben verificarse para el acto procesal. La antigua parte variable no puede mostrarse como si siguiera íntegramente vigente.",
      ],
    },
  ],
  type: "Autoliquidación de tasa judicial",
  presenter:
    "La persona jurídica sujeta que realiza el acto procesal, directamente o mediante representante/procurador autorizado.",
  nonPresenter:
    "Las personas físicas y las personas jurídicas o actos cubiertos por exenciones legales, tras comprobar sus requisitos.",
  periodicity: "No periódica; antes del acto procesal sujeto.",
  deadline:
    "Se presenta y paga antes de acompañar el justificante al escrito procesal correspondiente.",
  channel:
    "Presentación electrónica, por lotes o predeclaración cuando esté habilitada; el justificante/NRC se aporta al procedimiento.",
  result:
    "Cuota a ingresar y justificante procesal; una cuantía posterior distinta puede exigir complementaria o rectificación.",
  included: [
    "Determinados actos de personas jurídicas en órdenes civil, contencioso-administrativo y social.",
    "Cuota fija vigente, cuantía del proceso, fecha y exenciones.",
  ],
  excluded: [
    "Personas físicas.",
    "Asistencia jurídica gratuita, Ministerio Fiscal, Administraciones y demás exenciones aplicables.",
    "Componentes anulados por la STC 140/2016.",
  ],
  preparation: [
    "Acto procesal, orden jurisdiccional y cuantía.",
    "Identificación del sujeto y representante.",
    "Justificación de exención y referencia del escrito/procedimiento.",
  ],
  commonMistakes: [
    "Cobrar a una persona física.",
    "Usar la tabla anterior a la STC 140/2016.",
    "No aportar el justificante al escrito.",
  ],
  correction:
    "Si la cuantía definitiva aumenta, revisa la complementaria en el plazo legal; si disminuye, solicita rectificación/devolución. El 695 solo cubre devoluciones parciales por supuestos procesales específicos.",
  procedureSourceId: "aeat.model-696.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-696.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-696.tc-note.2026-07-14",
  additionalOfficialLinks: [
    {
      label: "Instrucciones oficiales PDF",
      sourceId: "aeat.model-696.instructions-pdf.2026-07-14",
    },
  ],
  legalSourceIds: [],
  related: [
    {
      code: "695",
      href: "/consultor-fiscal/modelos/695",
      description:
        "Solicitud de devolución parcial en supuestos procesales tasados.",
    },
  ],
  specificFaq: [
    {
      question: "¿Pagan las personas físicas?",
      answer: "No. Las personas físicas están exentas de la tasa judicial.",
    },
    {
      question: "¿Sigue vigente la parte variable original?",
      answer:
        "No debe darse por vigente íntegramente: la STC 140/2016 anuló elementos relevantes y hay que consultar la regulación actual.",
    },
    {
      question: "¿Puede pagarlo el procurador?",
      answer:
        "Puede presentarlo un representante autorizado por cuenta del sujeto pasivo; el justificante debe vincularse al procedimiento.",
    },
  ],
});

const SPECIAL_WARNING = {
  title: "Regularización voluntaria especial de alta complejidad",
  paragraphs: [
    "Este procedimiento puede tener consecuencias tributarias y penales. Debe revisarse con asesoramiento tributario y jurídico especializado antes de presentar.",
    "No es una declaración fuera de plazo ordinaria y la presentación no garantiza por sí sola la exclusión de responsabilidad penal.",
  ],
} as const;

export const MODEL_770_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "770",
  category: CATEGORY,
  statusLabel: "Regularización especial · alta complejidad",
  statusTone: "auxiliary",
  intro: [
    "El Modelo 770 ingresa los intereses de demora y recargos de la regularización voluntaria especial del artículo 252 de la Ley General Tributaria.",
    "Se relaciona con conductas potencialmente relevantes conforme al artículo 305 del Código Penal y no sirve para una declaración trimestral presentada simplemente fuera de plazo.",
  ],
  notices: [
    SPECIAL_WARNING,
    {
      title: "No incluye la cuota principal",
      paragraphs: [
        "El principal se presenta en el modelo tributario ordinario o, solo si no existe modelo electrónico disponible, mediante el 771. No hay calendario periódico ni una calculadora automática segura.",
      ],
    },
  ],
  type: "Autoliquidación especial de intereses y recargos",
  presenter:
    "La persona o entidad que realiza una regularización voluntaria completa y encaja en el supuesto excepcional, con revisión jurídica y tributaria.",
  nonPresenter:
    "Quien presenta tarde un 100, 200, 303 u otro modelo ordinario sin concurrir este procedimiento especial.",
  periodicity:
    "No periódica; vinculada a una regularización concreta y al momento legalmente exigido.",
  deadline:
    "No existe fecha fija de campaña: el momento debe cumplir los requisitos del artículo 252 LGT y del artículo 305 del Código Penal.",
  channel:
    "Presentación electrónica, pago íntegro y aportación/conservación de todos los justificantes de principal, intereses y recargos.",
  result:
    "Ingreso de intereses y recargos; no liquida el principal ni garantiza efectos penales.",
  included: [
    "Intereses de demora de la regularización especial.",
    "Recargos que deban integrarse en el reconocimiento completo.",
    "Concepto, ejercicio, periodo, vencimiento y fecha de pago.",
  ],
  excluded: [
    "Cuota principal, que va al modelo ordinario o excepcionalmente al 771.",
    "Recargo ordinario aislado del artículo 27, aplazamiento o liquidación emitida por AEAT.",
    "Una promesa de exclusión penal.",
  ],
  preparation: [
    "Análisis conjunto del concepto, ejercicios y modelos ordinarios disponibles.",
    "Cuota principal presentada/pagada y justificantes.",
    "Cálculo documentado de fechas, intereses y recargos por especialista.",
  ],
  commonMistakes: [
    "Usarlo para cualquier extemporánea.",
    "Incluir la cuota principal.",
    "Prometer el efecto penal o automatizar el cálculo.",
  ],
  correction:
    "Una corrección debe revisarse integralmente con los modelos del principal y 771/770, pagos y documentación; no se corrige una pieza sin comprobar que la regularización completa sigue cumpliendo requisitos.",
  procedureSourceId: "aeat.model-770.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-770.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-770.faq.2022-06-09",
  legalSourceIds: [
    "boe.order-hac-530-2020.consolidated.2026-07-14",
    "boe.lgt.article-252.2026-07-14",
  ],
  related: [
    {
      code: "771",
      href: "/consultor-fiscal/modelos/771",
      description:
        "Cuota principal únicamente cuando no existe un modelo electrónico ordinario.",
    },
  ],
  specificFaq: [
    {
      question: "¿Sirve para cualquier declaración fuera de plazo?",
      answer:
        "No. Es el procedimiento excepcional del artículo 252 LGT, no la regularización ordinaria de una autoliquidación tardía.",
    },
    {
      question: "¿Incluye la cuota principal?",
      answer:
        "No. El principal va en el modelo ordinario o, solo si no existe, en el 771.",
    },
    {
      question:
        "¿La presentación elimina automáticamente la responsabilidad penal?",
      answer:
        "No. El posible efecto depende del cumplimiento completo de los requisitos legales y exige revisión especializada.",
    },
  ],
  extraSections: [
    {
      id: "model-770-flow",
      title: "Secuencia documental obligatoria",
      cards: [
        {
          title: "1. Principal",
          paragraphs: [
            "Identifica el concepto y utiliza su modelo ordinario; solo si no existe modelo electrónico puede valorarse el 771.",
          ],
        },
        {
          title: "2. Intereses y recargos",
          paragraphs: ["Calcula documentalmente y presenta el 770."],
        },
        {
          title: "3. Integridad",
          paragraphs: [
            "Paga íntegramente, conserva justificantes y aporta documentación cuando corresponda.",
          ],
        },
      ],
    },
  ],
});

export const MODEL_771_GUIDE_V1 = createBatch5PracticalGuideV1({
  code: "771",
  category: CATEGORY,
  statusLabel: "Solo sin modelo ordinario · alta complejidad",
  statusTone: "auxiliary",
  intro: [
    "El Modelo 771 ingresa la cuota principal de una regularización voluntaria especial cuando el impuesto o ejercicio no dispone de modelo electrónico ordinario en la sede.",
    "No puede sustituir por comodidad un Modelo 100, 200, 303 u otro disponible y no incluye intereses ni recargos.",
  ],
  notices: [
    SPECIAL_WARNING,
    {
      title: "Comprueba primero si existe modelo ordinario",
      paragraphs: [
        "Si existe, debe utilizarse. El 771 solo cubre la ausencia real de un formulario electrónico para el concepto/ejercicio; después el 770 recoge intereses y recargos.",
      ],
    },
  ],
  type: "Autoliquidación especial de cuota principal",
  presenter:
    "Quien regulariza bajo el artículo 252 LGT un concepto/ejercicio sin modelo electrónico ordinario disponible, tras revisión especializada.",
  nonPresenter:
    "Quien dispone de un modelo ordinario, busca un modelo genérico por comodidad o realiza una complementaria ordinaria.",
  periodicity: "No periódica.",
  deadline:
    "Sin campaña fija; debe coordinarse con el momento legal de la regularización voluntaria completa.",
  channel:
    "Presentación electrónica y pago/NRC, con documentación que justifique el concepto, ejercicio y ausencia de modelo ordinario.",
  result:
    "Ingreso de la cuota principal; intereses/recargos se presentan en el 770 y no se garantiza efecto penal.",
  included: [
    "Cuota principal de conceptos/ejercicios sin modelo electrónico disponible.",
    "Concepto, ejercicio, periodo, base, cuota y justificante.",
  ],
  excluded: [
    "Intereses y recargos del 770.",
    "Modelos 100, 200, 303 u otros que sí estén disponibles.",
    "Aplazamientos, cartas de pago o complementarias ordinarias.",
  ],
  preparation: [
    "Evidencia de que no existe modelo electrónico ordinario.",
    "Cálculo completo de la cuota principal por concepto/ejercicio.",
    "Plan documental conjunto con 770 y pagos.",
  ],
  commonMistakes: [
    "Usarlo en lugar de un 303 disponible.",
    "Incluir intereses.",
    "Tratarlo como carta de pago genérica.",
  ],
  correction:
    "Revisa cuota, 770, pagos y documentación como una unidad; un ingreso insuficiente o excesivo exige el procedimiento oficial y asesoramiento especializado.",
  procedureSourceId: "aeat.model-771.procedure-home.2026-07-14",
  recordSourceId: "aeat.model-771.procedure-record.2026-07-14",
  helpSourceId: "aeat.model-771.faq.2026-07-14",
  legalSourceIds: [
    "boe.order-hac-530-2020.consolidated.2026-07-14",
    "boe.lgt.article-252.2026-07-14",
  ],
  related: [
    {
      code: "770",
      href: "/consultor-fiscal/modelos/770",
      description: "Intereses y recargos de la misma regularización especial.",
    },
  ],
  specificFaq: [
    {
      question: "¿Puedo usarlo en lugar del Modelo 303?",
      answer:
        "No si el 303 ordinario está disponible para ese concepto y ejercicio.",
    },
    {
      question: "¿Qué significa sin modelo disponible?",
      answer:
        "Que la sede no ofrece un formulario electrónico ordinario específico para el concepto/ejercicio, no que resulte incómodo utilizarlo.",
    },
    {
      question: "¿Incluye intereses?",
      answer:
        "No. El 771 recoge principal; los intereses y recargos van en el 770.",
    },
  ],
  extraSections: [
    {
      id: "model-771-ordinary-model-check",
      title: "Decisión previa",
      cards: [
        {
          title: "Existe modelo ordinario",
          paragraphs: ["Utilízalo; el 771 no es una alternativa."],
        },
        {
          title: "No existe modelo electrónico",
          paragraphs: [
            "Documenta la ausencia y revisa si procede 771; presenta después el 770 para intereses y recargos.",
          ],
        },
      ],
    },
  ],
});
