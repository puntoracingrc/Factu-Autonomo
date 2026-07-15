import type {
  FiscalModelGuideInternalHrefV1,
  FiscalModelPracticalGuideV1,
} from "./fiscal-model-practical-guide.types";

type Batch5CodeV1 = Extract<
  FiscalModelPracticalGuideV1["code"],
  | "600"
  | "602"
  | "604"
  | "610"
  | "611"
  | "615"
  | "616"
  | "620"
  | "630"
  | "650"
  | "651"
  | "655"
  | "681"
  | "682"
  | "683"
  | "684"
  | "685"
  | "695"
  | "696"
  | "763"
  | "770"
  | "771"
  | "780"
  | "781"
  | "791"
  | "792"
  | "793"
  | "795"
  | "796"
  | "797"
>;

export interface Batch5GuideSpecV1 {
  readonly code: Batch5CodeV1;
  readonly category: string;
  readonly statusLabel: string;
  readonly statusTone?: FiscalModelPracticalGuideV1["statusTone"];
  readonly intro: readonly [string, string];
  readonly notices: FiscalModelPracticalGuideV1["notices"];
  readonly type: string;
  readonly presenter: string;
  readonly nonPresenter: string;
  readonly periodicity: string;
  readonly deadline: string;
  readonly channel: string;
  readonly result: string;
  readonly included: readonly string[];
  readonly excluded: readonly string[];
  readonly preparation: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly correction: string;
  readonly procedureSourceId: string;
  readonly recordSourceId: string;
  readonly helpSourceId?: string;
  readonly additionalOfficialLinks?: readonly {
    readonly label: string;
    readonly sourceId: string;
  }[];
  readonly document?: { readonly label: string; readonly sourceId: string };
  readonly legalSourceIds: readonly string[];
  readonly related: readonly {
    readonly code: string;
    readonly href: FiscalModelGuideInternalHrefV1;
    readonly description: string;
  }[];
  readonly specificFaq: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
  readonly extraSections?: FiscalModelPracticalGuideV1["sections"];
  readonly territorialGate?: boolean;
  readonly pdfAdobeWarning?: boolean;
  readonly allowProcedureAction?: boolean;
  readonly primaryActionLabel?: string;
  readonly effectiveYear?: number;
  readonly requiresAnnualReview?: boolean;
}

const TERRITORIAL_NOTICE = {
  title: "Primero comprueba qué Administración es competente",
  paragraphs: [
    "La mayoría de las operaciones de ITP y AJD y de Sucesiones y Donaciones se gestionan por comunidades autónomas; País Vasco y Navarra aplican sus reglas forales. La AEAT estatal interviene, entre otros supuestos, en Ceuta, Melilla, determinados no residentes y otros casos de competencia estatal.",
    "La residencia de las personas, la localización y clase del bien, el documento y el territorio foral pueden cambiar la competencia. El lugar de firma no la determina por sí solo. Compruébala antes de abrir un formulario o realizar un pago.",
  ],
} as const;

export function createBatch5PracticalGuideV1(
  spec: Batch5GuideSpecV1,
): FiscalModelPracticalGuideV1 {
  if (spec.related.length === 0 && spec.code !== "791") {
    throw new Error(`Model ${spec.code} needs a related model`);
  }
  if (spec.specificFaq.length < 2 || spec.commonMistakes.length < 2) {
    throw new Error(`Model ${spec.code} needs specific FAQ and mistakes`);
  }

  const related = spec.related[0] ?? {
    code: "catálogo",
    href: "/consultor-fiscal/modelos" as const,
    description: "Consulta el catálogo general sin inferir otra obligación.",
  };
  const actions: FiscalModelPracticalGuideV1["actions"] = [
    {
      label:
        spec.primaryActionLabel ??
        (spec.territorialGate
          ? "Comprobar Administración competente"
          : spec.allowProcedureAction === false
            ? "Consultar gestiones y periodos históricos"
            : `Abrir gestiones oficiales del Modelo ${spec.code}`),
      sourceId: spec.procedureSourceId,
      primary: true,
    },
    {
      label: "Consultar la ficha administrativa oficial",
      sourceId: spec.recordSourceId,
    },
    spec.helpSourceId
      ? {
          label: "Consultar ayuda e instrucciones oficiales",
          sourceId: spec.helpSourceId,
        }
      : {
          label: `Ver la ficha relacionada del Modelo ${related.code}`,
          internalHref: related.href,
        },
  ];

  const sourceIds = [
    spec.procedureSourceId,
    spec.recordSourceId,
    spec.helpSourceId,
    spec.document?.sourceId,
    ...(spec.additionalOfficialLinks ?? []).map((link) => link.sourceId),
    ...spec.legalSourceIds,
  ].filter((value): value is string => Boolean(value));

  return {
    code: spec.code,
    editorialCategory: spec.category,
    statusLabel: spec.statusLabel,
    statusTone: spec.statusTone,
    effectiveYear: spec.effectiveYear,
    lastVerifiedAt: "2026-07-15",
    requiresAnnualReview: spec.requiresAnnualReview ?? true,
    externalActionNotice:
      "Los trámites se abren en la sede oficial correspondiente. Factu no firma, presenta, paga ni envía declaraciones, solicitudes o documentos a la Agencia Tributaria.",
    intro: spec.intro,
    notices: [
      ...(spec.territorialGate ? [TERRITORIAL_NOTICE] : []),
      ...spec.notices,
      ...(spec.pdfAdobeWarning
        ? [
            {
              title: "Descarga el PDF oficial antes de abrirlo",
              paragraphs: [
                "La AEAT recomienda guardar el formulario en el ordenador y abrirlo con Adobe Acrobat Reader. Chrome o Edge pueden impedir que funcione el botón que genera el código; el aviso de documento modificado puede deberse al código incorporado por la AEAT.",
                "Generar el PDF no equivale a pagar ni presentar el impuesto. Completa el ingreso y la presentación ante la Administración competente.",
              ],
            },
          ]
        : []),
    ],
    actions,
    quickSummaryTitle: `El Modelo ${spec.code} en pocas palabras`,
    quickFacts: [
      { label: "Tipo", value: spec.type },
      { label: "Quién lo presenta", value: spec.presenter },
      { label: "Quién no lo presenta", value: spec.nonPresenter },
      { label: "Periodicidad", value: spec.periodicity },
      { label: "Plazo", value: spec.deadline },
      { label: "Resultado", value: spec.result },
    ],
    sections: [
      {
        id: `model-${spec.code}-decision`,
        title: "¿Me corresponde? Quién presenta y quién no",
        cards: [
          { title: "Declarante real", paragraphs: [spec.presenter] },
          { title: "No es el declarante", paragraphs: [spec.nonPresenter] },
        ],
      },
      {
        id: `model-${spec.code}-scope`,
        title: "Qué incluye y qué queda fuera",
        cards: [
          { title: "Incluye", bullets: spec.included },
          { title: "No debe confundirse con", bullets: spec.excluded },
        ],
      },
      {
        id: `model-${spec.code}-filing`,
        title: "Periodicidad, plazo, canal y efecto",
        cards: [
          { title: "Cuándo", paragraphs: [spec.periodicity, spec.deadline] },
          { title: "Cómo", paragraphs: [spec.channel, spec.result] },
        ],
        note: "Comprueba el ejercicio, el territorio y la campaña en la sede oficial antes de actuar.",
      },
      {
        id: `model-${spec.code}-prepare`,
        title: "Documentación y controles previos",
        cards: [
          { title: "Prepara y concilia", bullets: spec.preparation },
          { title: "Errores frecuentes", bullets: spec.commonMistakes },
        ],
      },
      ...(spec.extraSections ?? []),
    ],
    fillingTitle: `Guía práctica para preparar el Modelo ${spec.code}`,
    fillingSteps: [
      {
        title: "1. Confirma sujeto, operación y Administración",
        paragraphs: [spec.presenter, spec.nonPresenter],
      },
      {
        title: "2. Fija el periodo y la regla aplicable",
        paragraphs: [spec.periodicity, spec.deadline],
      },
      {
        title: "3. Reúne y concilia los justificantes",
        paragraphs: [
          "Trabaja con documentos oficiales y datos del periodo correcto; no reutilices tarifas, escalas o campañas de otro ejercicio.",
        ],
        bullets: spec.preparation,
      },
      {
        title: "4. Utiliza exclusivamente el canal oficial",
        paragraphs: [spec.channel],
      },
      {
        title: "5. Conserva la respuesta y revisa el efecto",
        paragraphs: [
          "Guarda justificante, NRC cuando exista, documentación aportada y respuesta administrativa. Un envío técnico no garantiza aceptación, devolución, exención o efecto jurídico.",
        ],
      },
    ],
    afterTitle: "Después del trámite o la consulta",
    afterSteps: [
      {
        title: "Guarda la evidencia",
        description:
          "Conserva justificante, documentos de soporte y respuesta oficial.",
      },
      { title: "Comprueba el resultado", description: spec.result },
      { title: "Corrige por el cauce oficial", description: spec.correction },
    ],
    comparison: {
      title: `Modelo ${spec.code} y modelos relacionados`,
      current: { title: `Modelo ${spec.code}`, description: spec.intro[0] },
      related: {
        title:
          related.code === "catálogo"
            ? "Catálogo de modelos"
            : `Modelo ${related.code}`,
        description: related.description,
        href: related.href,
        label:
          related.code === "catálogo"
            ? "Ver todos los modelos"
            : `Ver Modelo ${related.code}`,
      },
      additional: spec.related.slice(1).map((item) => ({
        title: `Modelo ${item.code}`,
        description: item.description,
        href: item.href,
        label: `Ver Modelo ${item.code}`,
      })),
      conclusion:
        "La relación entre modelos no implica que los presente la misma persona ni que uno sustituya automáticamente al otro.",
    },
    pdfNotice: spec.pdfAdobeWarning
      ? [
          "Descarga el PDF oficial en el ordenador y ábrelo con Adobe Acrobat Reader.",
          "Crear el documento no equivale a haber pagado o presentado el modelo.",
        ]
      : [
          "Los formularios, diseños y manuales son documentos oficiales de consulta: verifica siempre el ejercicio.",
          "Factu no recoge los datos del modelo ni realiza su presentación.",
        ],
    documents: spec.document ? [spec.document] : [],
    officialLinks: [
      ...(spec.helpSourceId
        ? [{ label: "Ayuda oficial del modelo", sourceId: spec.helpSourceId }]
        : []),
      ...(spec.additionalOfficialLinks ?? []),
    ],
    legalLinks: spec.legalSourceIds.map((sourceId, index) => ({
      label:
        index === 0
          ? `Normativa principal del Modelo ${spec.code}`
          : `Normativa complementaria ${index + 1}`,
      sourceId,
    })),
    faq: [
      { question: "¿Quién lo presenta?", answer: spec.presenter },
      {
        question: "¿Quién no debe presentarlo por este solo motivo?",
        answer: spec.nonPresenter,
      },
      {
        question: "¿Con qué periodicidad se presenta?",
        answer: spec.periodicity,
      },
      { question: "¿Cuál es el plazo?", answer: spec.deadline },
      { question: "¿Qué efecto puede producir?", answer: spec.result },
      { question: "¿Cómo se corrige un error?", answer: spec.correction },
      ...spec.specificFaq,
    ],
    sourceIds: [...new Set(sourceIds)],
  };
}
