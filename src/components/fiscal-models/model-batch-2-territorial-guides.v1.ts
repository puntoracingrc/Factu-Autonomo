import { createBatch2PracticalGuideV1 } from "./create-batch-2-practical-guide.v1";

export const MODEL_281_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "281",
  category: "ZEC · Comercio sin tránsito por Canarias",
  statusLabel: "Trimestral · Régimen territorial",
  statusTone: "territorial",
  effectiveYear: 2026,
  intro: [
    "El Modelo 281 informa trimestralmente de determinadas operaciones de comercio de bienes corporales realizadas por entidades ZEC sin que la mercancía transite materialmente por Canarias.",
    "No es una autoliquidación de IVA o IGIC ni corresponde a cualquier empresa canaria.",
  ],
  notices: [
    {
      title: "Solo entidades ZEC y libro específico",
      paragraphs: [
        "Debe conservarse el libro registro exigido y distinguir origen, destino, proveedor, cliente e importe de los bienes que no entran en Canarias.",
      ],
    },
  ],
  type: "Declaración informativa trimestral ZEC.",
  presenter:
    "Entidad de la Zona Especial Canaria que realiza las operaciones de comercio de bienes comprendidas.",
  nonPresenter:
    "Cualquier empresa canaria, una empresa sin condición ZEC o una operación en la que no concurre el supuesto de bienes sin tránsito por Canarias.",
  periodicity: "Trimestral.",
  deadline:
    "Durante el mes natural siguiente al trimestre; cuatro días técnicos adicionales solo ante la imposibilidad prevista oficialmente.",
  channel: "Formulario hasta 40.000 registros o presentación mediante fichero.",
  result: "Información; no liquida IVA ni IGIC.",
  included: [
    "Proveedor, cliente y mercancía corporal.",
    "País de origen y destino sin tránsito por Canarias.",
    "Fecha, importe, moneda y trimestre.",
    "Libro registro específico de las operaciones.",
  ],
  excluded: [
    "Operaciones de cualquier empresa canaria.",
    "IVA/IGIC de la operación.",
    "Ayudas del REF del Modelo 282.",
    "Operaciones intracomunitarias del 349 cuando no sean el supuesto ZEC.",
  ],
  preparation: [
    "Acreditar condición ZEC.",
    "Mantener el libro registro.",
    "Conciliar documentos comerciales y transporte.",
    "Validar origen, destino, moneda e importe.",
  ],
  correction:
    "Corrige o da de baja registros por las gestiones oficiales, preservando la trazabilidad con el libro específico.",
  procedureSourceId: "aeat.model-281.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-281.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-281.browser-help.2026-04-22",
  additionalOfficialLinks: [
    {
      label: "Ayuda de presentación por fichero",
      sourceId: "aeat.model-281.file-help.2026-04-22",
    },
  ],
  document: {
    label: "Consultar diseño de registro del Modelo 281",
    sourceId: "aeat.model-281.register-design-pdf.captured-2026-07-13",
  },
  legalSourceIds: ["boe.model-281.order-hfp-1285-2023"],
  related: [
    {
      code: "282",
      href: "/consultor-fiscal/modelos/282",
      description: "Ayudas fiscales del REF de Canarias.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Declaración anual de Sociedades.",
    },
    {
      code: "349",
      href: "/consultor-fiscal/modelos/349",
      description: "Operaciones intracomunitarias cuando proceda.",
    },
  ],
  specificFaq: [
    {
      question: "¿Los bienes tienen que pasar por Canarias?",
      answer:
        "No; la característica del modelo es precisamente que no transitan materialmente por Canarias.",
    },
    {
      question: "¿Qué límite tiene el formulario?",
      answer:
        "La AEAT ofrece formulario hasta 40.000 registros; para mayores volúmenes debe usarse fichero.",
    },
  ],
});

export const MODEL_282_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "282",
  category: "REF Canarias · Ayudas de Estado",
  statusLabel: "Plazo ligado a Renta o Sociedades",
  statusTone: "territorial",
  effectiveYear: 2026,
  intro: [
    "El Modelo 282 informa de determinadas ayudas fiscales del Régimen Económico y Fiscal de Canarias y otras ayudas de Estado.",
    "No se presenta por cualquier subvención canaria y su plazo depende de la declaración anual principal del beneficiario.",
  ],
  notices: [
    {
      title: "No tiene plazo fijo en enero",
      paragraphs: [
        "Para IRPF e IRNR sin establecimiento permanente se vincula a la campaña de Renta; para Sociedades e IRNR con establecimiento permanente, al plazo de Sociedades.",
      ],
    },
  ],
  type: "Declaración informativa anual de ayudas de Estado.",
  presenter:
    "Beneficiario obligado —persona física, sociedad o no residente— de ayudas fiscales o de Estado incluidas en el REF.",
  nonPresenter:
    "Cualquier receptor de una subvención en Canarias si la ayuda no entra en las categorías y obligaciones del modelo.",
  periodicity: "Anual, vinculada a la declaración tributaria principal.",
  deadline:
    "Dentro de la campaña de Renta para IRPF/IRNR sin EP o del plazo de Sociedades para IS/IRNR con EP.",
  channel:
    "Presentación electrónica conforme al tipo de beneficiario y ejercicio.",
  result:
    "Información de ayudas; no liquida por sí sola el impuesto principal.",
  included: [
    "RIC, ZEC, deducciones y bonificaciones canarias comprendidas.",
    "Ayudas regionales, de funcionamiento y de minimis.",
    "Beneficiario, sector, actividad, importe e intensidad.",
    "Acumulación y límites de ayudas de Estado.",
  ],
  excluded: [
    "Cualquier subvención recibida en Canarias.",
    "Operaciones ZEC del Modelo 281.",
    "Ayudas del régimen balear del 283.",
    "Determinar automáticamente la compatibilidad o el límite.",
  ],
  preparation: [
    "Clasificar incentivo y categoría de ayuda.",
    "Identificar establecimiento y actividad en Canarias.",
    "Calcular importe, intensidad y acumulación.",
    "Coordinar con los Modelos 100 o 200.",
  ],
  correction:
    "Corrige la información por el trámite oficial y revisa también la declaración principal si el error altera el incentivo fiscal.",
  procedureSourceId: "aeat.model-282.procedure-home.2026-05-29",
  recordSourceId: "aeat.model-282.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-282.browser-file-help.2026-06-19",
  document: {
    label: "Consultar diseño de registro del Modelo 282",
    sourceId: "aeat.model-282.register-design-xlsx.captured-2026-07-13",
  },
  legalSourceIds: [
    "boe.model-282.order-hap-296-2016",
    "boe.model-282.order-hac-1430-2025",
  ],
  related: [
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description: "Declaración de Renta del beneficiario persona física.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Declaración de Sociedades del beneficiario.",
    },
    {
      code: "281",
      href: "/consultor-fiscal/modelos/281",
      description: "Operaciones de comercio de bienes ZEC.",
    },
    {
      code: "283",
      href: "/consultor-fiscal/modelos/283",
      description: "Ayudas del régimen fiscal balear.",
    },
  ],
  specificFaq: [
    {
      question: "¿Se presenta por cualquier subvención?",
      answer:
        "No. Solo por las ayudas fiscales y de Estado incluidas en la normativa y el diseño del modelo.",
    },
    {
      question: "¿Puede presentarlo un autónomo?",
      answer:
        "Sí, si es beneficiario obligado de una ayuda incluida; el plazo se coordina con su campaña de Renta.",
    },
  ],
});

export const MODEL_283_GUIDE_V1 = createBatch2PracticalGuideV1({
  code: "283",
  category: "Illes Balears · Ayudas fiscales",
  statusLabel: "Régimen territorial reciente",
  statusTone: "territorial",
  effectiveYear: 2026,
  intro: [
    "El Modelo 283 informa de determinadas ayudas fiscales vinculadas al Régimen Fiscal Especial de las Illes Balears.",
    "No se presenta por cualquier ayuda recibida en Baleares y su plazo se coordina con Renta o Sociedades.",
  ],
  notices: [
    {
      title: "No confundir con el Modelo 282",
      paragraphs: [
        "El 283 corresponde al régimen balear; el 282, al REF de Canarias. Ambos exigen clasificar la ayuda y comprobar acumulación y límites.",
      ],
    },
  ],
  type: "Declaración informativa anual de ayudas fiscales.",
  presenter:
    "Beneficiario obligado de incentivos del régimen fiscal balear considerados ayudas de Estado.",
  nonPresenter:
    "Cualquier receptor de una subvención balear si no está incluida en el régimen y obligación del modelo.",
  periodicity: "Anual, vinculada a la declaración principal.",
  deadline:
    "Campaña de Renta para IRPF/IRNR sin EP o plazo de Sociedades para IS/IRNR con EP; no existe plazo general en enero.",
  channel:
    "Presentación electrónica; cuatro días técnicos adicionales solo cuando se cumpla el supuesto oficial.",
  result: "Información de ayudas; no genera por sí sola pago.",
  included: [
    "Reserva para inversiones del régimen balear.",
    "Incentivos para empresas industriales, agrícolas, ganaderas y pesqueras.",
    "Beneficiario, actividad, inversión e importe.",
    "Ayuda regional, minimis, acumulación y límites.",
  ],
  excluded: [
    "Cualquier ayuda recibida en Baleares.",
    "Ayudas del REF de Canarias del 282.",
    "Autoliquidación del impuesto principal.",
    "Promesa de compatibilidad de ayudas.",
  ],
  preparation: [
    "Identificar incentivo y periodo.",
    "Documentar actividad e inversión.",
    "Calcular importe, categoría y acumulación.",
    "Coordinar con los Modelos 100 o 200.",
  ],
  correction:
    "Corrige el Modelo 283 y revisa la declaración principal si el error modifica el incentivo aplicado.",
  procedureSourceId: "aeat.model-283.procedure-home.2026-07-08",
  recordSourceId: "aeat.model-283.procedure-record.2026-07-08",
  helpSourceId: "aeat.model-283.browser-file-help.2026-06-19",
  document: {
    label: "Consultar diseño de registro del Modelo 283",
    sourceId: "aeat.model-283.register-design-pdf.captured-2026-07-13",
  },
  legalSourceIds: [
    "boe.model-283.order-hac-1031-2024",
    "boe.model-283.royal-decree-710-2024",
  ],
  related: [
    {
      code: "282",
      href: "/consultor-fiscal/modelos/282",
      description: "Ayudas del REF de Canarias.",
    },
    {
      code: "100",
      href: "/consultor-fiscal/modelos/100",
      description: "Renta de personas físicas.",
    },
    {
      code: "200",
      href: "/consultor-fiscal/modelos/200",
      description: "Impuesto sobre Sociedades.",
    },
  ],
  specificFaq: [
    {
      question: "¿Qué diferencia existe con el 282?",
      answer:
        "El 283 informa incentivos del régimen balear; el 282 informa ayudas del REF de Canarias.",
    },
    {
      question: "¿Genera un pago?",
      answer:
        "No directamente. Informa ayudas, aunque estas se relacionen con beneficios aplicados en Renta o Sociedades.",
    },
  ],
});
