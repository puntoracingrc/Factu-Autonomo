import type {
  FiscalModelGuideInternalHrefV1,
  FiscalModelPracticalGuideV1,
} from "./fiscal-model-practical-guide.types";

type Batch1CodeV1 = Extract<
  FiscalModelPracticalGuideV1["code"],
  | "038"
  | "039"
  | "043"
  | "044"
  | "045"
  | "102"
  | "113"
  | "136"
  | "146"
  | "147"
  | "150"
  | "156"
  | "159"
  | "165"
  | "170"
  | "171"
  | "174"
  | "181"
  | "182"
  | "185"
  | "186"
  | "189"
  | "192"
  | "195"
  | "198"
  | "199"
  | "206"
  | "213"
  | "217"
  | "220"
>;

export interface Batch1GuideSpecV1 {
  readonly code: Batch1CodeV1;
  readonly category: string;
  readonly statusLabel?: string;
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
  readonly document?: { readonly label: string; readonly sourceId: string };
  readonly legalSourceIds: readonly string[];
  readonly related: readonly {
    readonly code: string;
    readonly href: FiscalModelGuideInternalHrefV1;
    readonly description: string;
  }[];
  readonly faq: FiscalModelPracticalGuideV1["faq"];
  readonly effectiveYear?: number;
  readonly taxPeriodYear?: number;
  readonly filingYear?: number;
  readonly monthlyFromYear?: number;
  readonly firstMonthlyFiling?: `${number}-${number}`;
  readonly requiresAnnualReview?: boolean;
  readonly primaryActionLabel?: string;
  readonly allowProcedureAction?: boolean;
  readonly externalActionNotice?: string;
  readonly extraSections?: FiscalModelPracticalGuideV1["sections"];
}

export function createBatch1PracticalGuideV1(
  spec: Batch1GuideSpecV1,
): FiscalModelPracticalGuideV1 {
  if (spec.related.length === 0) {
    throw new Error(`Model ${spec.code} needs at least one related model`);
  }
  if (spec.faq.length < 6) {
    throw new Error(`Model ${spec.code} needs at least six FAQ entries`);
  }

  const [mainRelated, ...additionalRelated] = spec.related;
  const actionLinks: FiscalModelPracticalGuideV1["actions"] =
    spec.allowProcedureAction === false
      ? [
          {
            label: "Consultar la ficha oficial del procedimiento",
            sourceId: spec.recordSourceId,
            primary: true,
          },
          {
            label: `Ver la ficha relacionada del Modelo ${mainRelated.code}`,
            internalHref: mainRelated.href,
          },
          ...(spec.helpSourceId
            ? [
                {
                  label: "Consultar la ayuda oficial disponible",
                  sourceId: spec.helpSourceId,
                },
              ]
            : []),
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
            label: "Consultar la ficha oficial del procedimiento",
            sourceId: spec.recordSourceId,
            primary: true,
          },
          ...(spec.helpSourceId
            ? [
                {
                  label: "Consultar la ayuda oficial disponible",
                  sourceId: spec.helpSourceId,
                },
              ]
            : [
                {
                  label: `Ver la ficha relacionada del Modelo ${mainRelated.code}`,
                  internalHref: mainRelated.href,
                },
              ]),
        ];

  const sourceIds = [
    spec.procedureSourceId,
    spec.recordSourceId,
    spec.helpSourceId,
    spec.document?.sourceId,
    ...spec.legalSourceIds,
  ].filter((value): value is string => Boolean(value));

  return {
    code: spec.code,
    editorialCategory: spec.category,
    statusLabel: spec.statusLabel,
    statusTone: spec.statusTone,
    effectiveYear: spec.effectiveYear,
    taxPeriodYear: spec.taxPeriodYear,
    filingYear: spec.filingYear,
    monthlyFromYear: spec.monthlyFromYear,
    firstMonthlyFiling: spec.firstMonthlyFiling,
    lastVerifiedAt: "2026-07-15",
    requiresAnnualReview: spec.requiresAnnualReview ?? true,
    externalActionNotice: spec.externalActionNotice,
    intro: spec.intro,
    notices: spec.notices,
    actions: actionLinks,
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
        title: "Quién presenta y quién no",
        cards: [
          {
            title: "Declarante",
            paragraphs: [spec.presenter],
          },
          {
            title: "No es el declarante por este solo motivo",
            paragraphs: [spec.nonPresenter],
          },
        ],
      },
      {
        id: `model-${spec.code}-scope`,
        title: "Qué incluye y qué queda fuera",
        cards: [
          { title: "Información u operaciones incluidas", bullets: spec.included },
          { title: "No debe confundirse con", bullets: spec.excluded },
        ],
      },
      {
        id: `model-${spec.code}-filing-rules`,
        title: "Periodicidad, plazo y canal",
        cards: [
          {
            title: "Cuándo",
            paragraphs: [spec.periodicity, spec.deadline],
          },
          {
            title: "Cómo",
            paragraphs: [spec.channel],
          },
        ],
        note:
          "Comprueba siempre el ejercicio y el trámite oficial antes de presentar: los calendarios, diseños y canales pueden cambiar.",
      },
      {
        id: `model-${spec.code}-prepare`,
        title: "Documentos, controles y errores habituales",
        cards: [
          {
            title: "Preparación y conciliación",
            bullets: spec.preparation,
          },
          {
            title: "Si detectas un error",
            paragraphs: [spec.correction],
          },
        ],
      },
      ...(spec.extraSections ?? []),
    ],
    fillingTitle: `Guía práctica para preparar el Modelo ${spec.code}`,
    fillingSteps: [
      {
        title: "1. Confirma que eres el obligado",
        paragraphs: [
          `Contrasta tu situación con la ficha oficial. ${spec.nonPresenter}`,
        ],
      },
      {
        title: "2. Fija ejercicio y periodo",
        paragraphs: [spec.periodicity, spec.deadline],
      },
      {
        title: "3. Reúne y concilia los datos",
        paragraphs: [
          "Prepara la información antes de abrir el trámite y compárala con tus registros o con los del organismo obligado.",
        ],
        bullets: spec.preparation,
      },
      {
        title: "4. Valida el canal oficial",
        paragraphs: [spec.channel],
      },
      {
        title: "5. Revisa y conserva el justificante",
        paragraphs: [
          "Comprueba identificadores, periodo, totales y registros rechazados antes de finalizar. Conserva la respuesta o justificante oficial.",
        ],
      },
    ],
    afterTitle: "Después de presentar o consultar",
    afterSteps: [
      {
        title: "Guarda la evidencia",
        description:
          "Conserva el justificante, el fichero enviado y la respuesta de aceptación o rechazo de la AEAT.",
      },
      {
        title: "Revisa rechazos",
        description:
          "Un envío técnico no equivale siempre a una aceptación completa; comprueba los registros rechazados.",
      },
      {
        title: "Corrige por el cauce oficial",
        description: spec.correction,
      },
    ],
    comparison: {
      title: `Modelo ${spec.code} y modelos relacionados`,
      current: {
        title: `Modelo ${spec.code}`,
        description: spec.intro[0],
      },
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
      "Los PDFs y diseños son documentos oficiales de consulta. Comprueba el ejercicio indicado y no reutilices un impreso histórico como si fuera el trámite vigente.",
      "Factu no recoge datos de la declaración ni realiza la presentación.",
    ],
    documents: spec.document ? [spec.document] : [],
    officialLinks: [
      ...(spec.helpSourceId
        ? [
            {
              label: "Ayuda oficial del modelo",
              sourceId: spec.helpSourceId,
            },
          ]
        : []),
    ],
    legalLinks: spec.legalSourceIds.map((sourceId, index) => ({
      label:
        index === 0
          ? `Normativa principal del Modelo ${spec.code}`
          : `Normativa complementaria ${index + 1}`,
      sourceId,
    })),
    faq: spec.faq,
    sourceIds: [...new Set(sourceIds)],
  };
}
