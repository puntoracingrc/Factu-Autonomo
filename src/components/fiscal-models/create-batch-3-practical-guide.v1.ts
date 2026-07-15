import type {
  FiscalModelGuideInternalHrefV1,
  FiscalModelPracticalGuideV1,
} from "./fiscal-model-practical-guide.types";

type Batch3CodeV1 = Extract<
  FiscalModelPracticalGuideV1["code"],
  | "353"
  | "364"
  | "365"
  | "368"
  | "379"
  | "380"
  | "381"
  | "410"
  | "411"
  | "430"
  | "480"
  | "490"
  | "504"
  | "505"
  | "506"
  | "507"
  | "508"
  | "510"
  | "512"
  | "515"
  | "517"
  | "518"
  | "519"
  | "520"
  | "521"
  | "522"
  | "523"
  | "524"
  | "544"
  | "545"
>;

export interface Batch3GuideSpecV1 {
  readonly code: Batch3CodeV1;
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
  readonly effectiveYear?: number;
  readonly transitionYear?: number;
  readonly requiresAnnualReview?: boolean;
  readonly primaryActionLabel?: string;
  readonly allowProcedureAction?: boolean;
  readonly readOnlyActionLabel?: string;
  readonly externalActionNotice?: string;
  readonly extraSections?: FiscalModelPracticalGuideV1["sections"];
}

export function createBatch3PracticalGuideV1(
  spec: Batch3GuideSpecV1,
): FiscalModelPracticalGuideV1 {
  if (spec.related.length === 0) {
    throw new Error(`Model ${spec.code} needs at least one related model`);
  }
  if (spec.specificFaq.length < 2) {
    throw new Error(
      `Model ${spec.code} needs at least two specific FAQ entries`,
    );
  }

  const [mainRelated, ...additionalRelated] = spec.related;
  const actions: FiscalModelPracticalGuideV1["actions"] =
    spec.allowProcedureAction === false
      ? [
          {
            label:
              spec.readOnlyActionLabel ??
              "Consultar la ficha oficial y comprobar su estado",
            sourceId: spec.procedureSourceId,
            primary: true,
          },
          {
            label: "Consultar la ficha administrativa oficial",
            sourceId: spec.recordSourceId,
          },
          {
            label: `Ver la ficha relacionada del Modelo ${mainRelated.code}`,
            internalHref: mainRelated.href,
          },
        ]
      : [
          {
            label:
              spec.primaryActionLabel ??
              `Abrir gestiones oficiales del Modelo ${spec.code}`,
            sourceId: spec.procedureSourceId,
            primary: true,
          },
          {
            label: "Consultar la ficha administrativa oficial",
            sourceId: spec.recordSourceId,
          },
          spec.helpSourceId
            ? {
                label: "Consultar la ayuda oficial disponible",
                sourceId: spec.helpSourceId,
              }
            : {
                label: `Ver la ficha relacionada del Modelo ${mainRelated.code}`,
                internalHref: mainRelated.href,
              },
        ];

  const faq: FiscalModelPracticalGuideV1["faq"] = [
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
    { question: "¿Qué efecto o resultado tiene?", answer: spec.result },
    { question: "¿Cómo se corrige un error?", answer: spec.correction },
    ...spec.specificFaq,
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
    transitionYear: spec.transitionYear,
    lastVerifiedAt: "2026-07-15",
    requiresAnnualReview: spec.requiresAnnualReview ?? true,
    externalActionNotice:
      spec.externalActionNotice ??
      "Los trámites se abren en la sede oficial correspondiente. Factu no firma, presenta ni envía declaraciones, solicitudes o documentos a la Agencia Tributaria.",
    intro: spec.intro,
    notices: spec.notices,
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
        id: `model-${spec.code}-obligados`,
        title: "¿Me corresponde? Quién presenta y quién no",
        cards: [
          { title: "Declarante", paragraphs: [spec.presenter] },
          { title: "No es el declarante", paragraphs: [spec.nonPresenter] },
        ],
      },
      {
        id: `model-${spec.code}-scope`,
        title: "Qué incluye y qué queda fuera",
        cards: [
          {
            title: "Operaciones, productos o datos incluidos",
            bullets: spec.included,
          },
          { title: "No debe confundirse con", bullets: spec.excluded },
        ],
      },
      {
        id: `model-${spec.code}-filing`,
        title: "Periodicidad, plazo, canal y efecto",
        cards: [
          { title: "Cuándo", paragraphs: [spec.periodicity, spec.deadline] },
          {
            title: "Cómo y con qué resultado",
            paragraphs: [spec.channel, spec.result],
          },
        ],
        note: "Comprueba el ejercicio y el trámite oficial antes de actuar: campañas, diseños, plazos y canales pueden cambiar.",
      },
      {
        id: `model-${spec.code}-prepare`,
        title: "Documentos, controles y correcciones",
        cards: [
          { title: "Preparación y conciliación", bullets: spec.preparation },
          { title: "Si detectas un error", paragraphs: [spec.correction] },
        ],
      },
      ...(spec.extraSections ?? []),
    ],
    fillingTitle: `Guía práctica para preparar el Modelo ${spec.code}`,
    fillingSteps: [
      {
        title: "1. Confirma el sujeto y el procedimiento",
        paragraphs: [spec.presenter, spec.nonPresenter],
      },
      {
        title: "2. Fija el periodo y la regla temporal",
        paragraphs: [spec.periodicity, spec.deadline],
      },
      {
        title: "3. Reúne y concilia la documentación",
        paragraphs: [
          "Prepara los datos antes de abrir el trámite y contrástalos con autorizaciones, registros, contabilidad y documentos de circulación aplicables.",
        ],
        bullets: spec.preparation,
      },
      {
        title: "4. Utiliza exclusivamente el canal oficial",
        paragraphs: [spec.channel],
      },
      {
        title: "5. Revisa la respuesta y conserva evidencia",
        paragraphs: [
          "Comprueba identificadores, periodo, cantidades y avisos. Conserva el justificante y la respuesta oficial, sin asumir que un envío técnico equivale a una autorización o devolución.",
        ],
      },
    ],
    afterTitle: "Después del trámite o la consulta",
    afterSteps: [
      {
        title: "Conserva la evidencia",
        description:
          "Guarda justificante, documentación de soporte, autorizaciones y respuesta oficial.",
      },
      {
        title: "Comprueba el efecto real",
        description:
          "Una solicitud, comunicación o envío no garantiza autorización, devolución ni aceptación completa.",
      },
      { title: "Corrige por el cauce oficial", description: spec.correction },
    ],
    comparison: {
      title: `Modelo ${spec.code} y modelos relacionados`,
      current: { title: `Modelo ${spec.code}`, description: spec.intro[0] },
      related: {
        title: `Modelo ${mainRelated.code}`,
        description: mainRelated.description,
        href: mainRelated.href,
        label: `Ver Modelo ${mainRelated.code}`,
      },
      additional: additionalRelated.map((item) => ({
        title: `Modelo ${item.code}`,
        description: item.description,
        href: item.href,
        label: `Ver Modelo ${item.code}`,
      })),
      conclusion:
        "Que dos modelos estén relacionados no significa que los presente la misma persona ni que uno sustituya automáticamente al otro.",
    },
    pdfNotice: [
      "Los PDFs, diseños y manuales son documentos oficiales de consulta. Comprueba el ejercicio indicado antes de reutilizarlos.",
      "Factu no recoge datos del modelo ni realiza su presentación.",
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
    faq,
    sourceIds: [...new Set(sourceIds)],
  };
}
