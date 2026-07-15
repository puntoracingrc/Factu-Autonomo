import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

const PILLAR_TWO_LEGAL = [
  "boe.complementary-tax.law-7-2024",
  "boe.complementary-tax.royal-decree-252-2025",
  "boe.models-240-242.order-hac-1198-2025",
] as const;

const pillarTwoNotice = {
  title: "Pilar Dos: solo grupos de gran magnitud",
  paragraphs: [
    "La familia 240–242 se dirige a grupos multinacionales y nacionales de gran magnitud, con umbral general de 750 millones de euros bajo las reglas legales. No es una obligación ordinaria de una pyme.",
  ],
} as const;

const pillarTwoSection = {
  id: "pillar-two-family",
  title: "Cómo se reparten las funciones 240, 241 y 242",
  cards: [
    {
      title: "Modelo 240",
      paragraphs: [
        "Identifica qué entidad constitutiva actuará como declarante de la información.",
      ],
    },
    {
      title: "Modelo 241",
      paragraphs: ["Contiene la declaración informativa global GIR/DAC9."],
    },
    {
      title: "Modelo 242",
      paragraphs: ["Autoliquida e ingresa el Impuesto Complementario."],
    },
    {
      title: "Conceptos comunes",
      bullets: [
        "Entidad constitutiva y matriz última.",
        "Jurisdicción, renta admisible e impuestos cubiertos.",
        "Tipo efectivo y mínimo global del 15 %.",
        "IIR, UTPR, impuesto nacional y puertos seguros.",
      ],
    },
  ],
} as const;

export const MODEL_240_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "240",
  category: "Impuesto Complementario · Pilar Dos",
  statusLabel: "Primera campaña · Comunicación de grandes grupos",
  statusTone: "current",
  effectiveYear: 2026,
  firstFilingDate: "2026-04-30",
  intro: [
    "El Modelo 240 comunica qué entidad constitutiva actuará como declarante de la información del Impuesto Complementario para un grupo de gran magnitud.",
    "Es una comunicación de identificación: no calcula el impuesto y no sustituye la GIR/DAC9 del Modelo 241 ni la autoliquidación del 242.",
  ],
  notices: [
    pillarTwoNotice,
    {
      title: "Primera campaña versionada",
      paragraphs: [
        "Para periodos terminados antes del 31 de marzo de 2025, la ventana especial fue del 30 de abril al 30 de junio de 2026. No es la regla permanente.",
      ],
    },
  ],
  type: "Comunicación de entidad declarante.",
  presenter:
    "Entidades constitutivas españolas de un grupo multinacional o nacional de gran magnitud; una comunicación puede cubrir a todas las españolas del grupo.",
  nonPresenter:
    "Una pyme ordinaria o una entidad fuera del ámbito del Impuesto Complementario.",
  periodicity: "Anual, vinculada a cada declaración informativa del grupo.",
  deadline:
    "Con carácter general, antes de los tres últimos meses previos al vencimiento del Modelo 241; primera ventana especial 30/04–30/06/2026.",
  channel:
    "Formulario web o, alternativamente, servicio web/XML, con alta, modificación y anulación.",
  result: "Identificación de la entidad declarante; no genera pago.",
  included: [
    "Entidad presentadora y constitutivas españolas cubiertas.",
    "Matriz última, grupo y jurisdicción.",
    "Periodo, contacto, NIF/TIN y LEI cuando exista.",
    "Alta, modificación y anulación de la comunicación.",
  ],
  excluded: [
    "Información GIR/DAC9 del Modelo 241.",
    "Cálculo o ingreso del Modelo 242.",
    "Aplicación a una empresa ordinaria fuera del umbral.",
    "Tratar la ventana de 2026 como plazo permanente.",
  ],
  preparation: [
    "Confirmar ámbito y entidades constitutivas españolas.",
    "Designar y documentar la entidad declarante.",
    "Identificar matriz última, TIN, LEI y jurisdicción.",
    "Calcular el plazo desde el vencimiento real del 241.",
  ],
  correction:
    "Utiliza las gestiones oficiales de modificación o anulación; no presentes una segunda alta sin comprobar el efecto sustitutorio.",
  procedureSourceId: "aeat.model-240.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-240.procedure-record.2026-06-10",
  helpSourceId: "aeat.model-240.web-service-help.2026-06-10",
  additionalOfficialLinks: [
    {
      label: "Ayuda del formulario 240",
      sourceId: "aeat.model-240.form-help.2026-06-10",
    },
    {
      label: "Esquema XSD y WSDL",
      sourceId: "aeat.model-240.xsd-wsdl-help.2026-06-10",
    },
  ],
  document: {
    label: "Manual oficial del servicio web 240",
    sourceId: "aeat.model-240.web-service-manual-pdf.v1-1.2026-05-27",
  },
  legalSourceIds: PILLAR_TWO_LEGAL,
  related: [
    {
      code: "241",
      href: "/consultor-fiscal/modelos/241",
      description: "Declaración informativa GIR/DAC9.",
    },
    {
      code: "242",
      href: "/consultor-fiscal/modelos/242",
      description: "Autoliquidación del Impuesto Complementario.",
    },
  ],
  extraSections: [pillarTwoSection],
  specificFaq: [
    {
      question: "¿Puede presentarse por XML?",
      answer:
        "Sí, la AEAT ofrece servicio web y cliente XML además del formulario.",
    },
    {
      question: "¿Sustituye al Modelo 241?",
      answer:
        "No. Solo comunica la entidad declarante; el 241 contiene la información GIR/DAC9.",
    },
  ],
});

export const MODEL_241_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "241",
  category: "Impuesto Complementario · GIR/DAC9",
  statusLabel: "Primera campaña · Grandes grupos",
  statusTone: "current",
  effectiveYear: 2026,
  firstFilingDate: "2026-04-30",
  intro: [
    "El Modelo 241 es la declaración informativa global GIR/DAC9 del Impuesto Complementario para grupos multinacionales o nacionales de gran magnitud.",
    "No es la autoliquidación: informa estructura, jurisdicciones, rentas, impuestos cubiertos, tipos efectivos, puertos seguros y elecciones.",
  ],
  notices: [
    pillarTwoNotice,
    {
      title: "Servicio web principal y formulario alternativo",
      paragraphs: [
        "La vía principal es el servicio web/XML. La AEAT mantiene un formulario alternativo y mecanismos diferenciados de nueva declaración, modificación y anulación.",
      ],
    },
  ],
  type: "Declaración informativa GIR/DAC9.",
  presenter:
    "Entidad declarante designada del grupo sujeto al Impuesto Complementario.",
  nonPresenter:
    "Una pyme ordinaria o cada entidad del grupo por separado cuando la información se presenta centralizadamente.",
  periodicity: "Anual, por el periodo impositivo del grupo.",
  deadline:
    "Último día del decimoquinto mes posterior al cierre; el primer ejercicio sujeto tiene regla del decimoctavo mes. Periodos terminados antes de 31/03/2025: 30/04–30/06/2026.",
  channel: "Servicio web/XML como vía principal y formulario web alternativo.",
  result:
    "Información GIR/DAC9 para administración e intercambio; no genera pago.",
  included: [
    "Estructura del grupo, matriz, declarante y entidades constitutivas.",
    "Jurisdicciones, renta admisible e impuestos cubiertos.",
    "Tipo efectivo, impuesto complementario y puertos seguros.",
    "Elecciones, declaraciones nuevas, modificaciones y anulaciones.",
  ],
  excluded: [
    "Autoliquidar el impuesto, función del Modelo 242.",
    "Designar a la entidad declarante, función del 240.",
    "Aplicación automática a pequeñas empresas.",
    "Simplificar el primer plazo ignorando la regla de 18 meses.",
  ],
  preparation: [
    "Cerrar perímetro y estructura del grupo.",
    "Conciliar GIR/DAC9 por jurisdicción.",
    "Documentar elecciones, puertos seguros e impuestos cubiertos.",
    "Validar XSD, referencias y mecanismo de corrección.",
  ],
  correction:
    "Utiliza el mecanismo correcto de complementaria, modificación o anulación; no mezcles tipos de mensaje sin seguir el manual técnico.",
  procedureSourceId: "aeat.model-241.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-241.procedure-record.2026-06-09",
  helpSourceId: "aeat.model-241.web-service-help.2026-06-26",
  additionalOfficialLinks: [
    {
      label: "Ayuda del formulario GIR/DAC9",
      sourceId: "aeat.model-241.form-help.2026-06-26",
    },
    {
      label: "Esquemas XSD y WSDL",
      sourceId: "aeat.model-241.xsd-wsdl-help.2026-06-09",
    },
  ],
  document: {
    label: "Manual oficial del servicio web 241",
    sourceId: "aeat.model-241.web-service-manual-pdf.v1-4.2026-06-26",
  },
  legalSourceIds: PILLAR_TWO_LEGAL,
  related: [
    {
      code: "240",
      href: "/consultor-fiscal/modelos/240",
      description: "Comunicación de la entidad declarante.",
    },
    {
      code: "242",
      href: "/consultor-fiscal/modelos/242",
      description: "Autoliquidación del impuesto.",
    },
    {
      code: "231",
      href: "/consultor-fiscal/modelos/231",
      description: "Información país por país CBC/DAC4, distinta de GIR/DAC9.",
    },
  ],
  extraSections: [pillarTwoSection],
  specificFaq: [
    {
      question: "¿Qué es la GIR?",
      answer:
        "La declaración informativa global del Impuesto Complementario con la información necesaria para aplicar las reglas de tributación mínima.",
    },
    {
      question: "¿Qué relación tiene con DAC9?",
      answer:
        "DAC9 establece el marco europeo de intercambio y presentación centralizada de la información del impuesto mínimo global.",
    },
  ],
});

export const MODEL_242_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "242",
  category: "Impuesto Complementario · Autoliquidación",
  statusLabel: "Primera campaña · Presentación por lotes",
  statusTone: "current",
  effectiveYear: 2026,
  firstFilingDate: "2026-07-01",
  intro: [
    "El Modelo 242 autoliquida el Impuesto Complementario devengado por contribuyentes de grupos multinacionales o nacionales de gran magnitud.",
    "Puede presentarse individualmente o por lotes y no sustituye la declaración informativa GIR/DAC9 del Modelo 241.",
  ],
  notices: [
    pillarTwoNotice,
    {
      title: "Plazo calculado desde el cierre",
      paragraphs: [
        "La regla general son 25 días naturales tras el decimoquinto mes; el primer ejercicio, tras el decimoctavo. Ninguna autoliquidación podía presentarse antes del 30 de junio de 2026.",
      ],
    },
  ],
  type: "Autoliquidación del Impuesto Complementario.",
  presenter:
    "Contribuyente o sustituto determinado por la Ley dentro de un grupo sujeto al Impuesto Complementario.",
  nonPresenter:
    "Una pyme ordinaria o una entidad fuera del ámbito del impuesto mínimo global.",
  periodicity:
    "Anual, por periodo impositivo y modalidad de impuesto aplicable.",
  deadline:
    "25 días naturales siguientes al decimoquinto mes posterior al cierre; primer ejercicio sujeto, tras el decimoctavo mes. No antes del 30/06/2026.",
  channel:
    "Presentación electrónica individual o por lotes, con los medios de pago oficiales.",
  result:
    "Cuota positiva o nula; la AEAT indica que no puede ser negativa ni dar lugar a devolución.",
  included: [
    "Impuesto complementario nacional, IIR o UTPR según proceda.",
    "Jurisdicción, renta admisible, impuestos cubiertos y tipo efectivo.",
    "Tipo mínimo del 15 %, ajustes, puertos seguros y cuota.",
    "Tributación estatal/foral, pago y presentación por lotes.",
  ],
  excluded: [
    "Declaración informativa GIR/DAC9 del 241.",
    "Designación del declarante del 240.",
    "Resultado negativo o devolución.",
    "Aplicación automática a empresas ordinarias.",
  ],
  preparation: [
    "Confirmar contribuyente o sustituto y modalidad.",
    "Conciliar el cálculo con la GIR/DAC9.",
    "Separar jurisdicciones, ajustes y reparto territorial.",
    "Preparar pago y, si procede, fichero de lotes.",
  ],
  correction:
    "Presenta complementaria o solicita rectificación por el cauce oficial, conservando la trazabilidad con la información del 241 y los pagos realizados.",
  procedureSourceId: "aeat.model-242.procedure-home.2026-07-01",
  recordSourceId: "aeat.model-242.procedure-record.2026-06-10",
  helpSourceId: "aeat.model-242.instructions.2026-07-08",
  legalSourceIds: PILLAR_TWO_LEGAL,
  related: [
    {
      code: "240",
      href: "/consultor-fiscal/modelos/240",
      description: "Comunicación de la entidad declarante.",
    },
    {
      code: "241",
      href: "/consultor-fiscal/modelos/241",
      description: "Declaración informativa GIR/DAC9.",
    },
  ],
  extraSections: [pillarTwoSection],
  specificFaq: [
    {
      question: "¿Puede presentarse por lotes?",
      answer:
        "Sí. La sede AEAT ofrece tanto presentación individual como presentación por lotes.",
    },
    {
      question: "¿Cuál es el tipo mínimo?",
      answer:
        "El marco de Pilar Dos persigue un tipo efectivo mínimo del 15 %, pero la cuota exige aplicar todas las reglas y ajustes legales.",
    },
  ],
});
