import type {
  FiscalModelGuideInternalHrefV1,
  FiscalModelPracticalGuideV1,
} from "./fiscal-model-practical-guide.types";

type FinalGuideCodeV1 = Extract<
  FiscalModelPracticalGuideV1["code"],
  | "798"
  | "848"
  | "901"
  | "933"
  | "952"
  | "980"
  | "981"
  | "990"
  | "991"
  | "992"
  | "993"
  | "995"
  | "996"
  | "997"
  | "A22"
  | "A23"
  | "A24"
>;

export interface FinalGuideSpecV1 {
  readonly code: FinalGuideCodeV1;
  readonly category: string;
  readonly statusLabel: string;
  readonly statusTone?: FiscalModelPracticalGuideV1["statusTone"];
  readonly intro: readonly [string, string];
  readonly notices: FiscalModelPracticalGuideV1["notices"];
  readonly declarationType: string;
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
  readonly legalLinks?: FiscalModelPracticalGuideV1["legalLinks"];
  readonly officialLinks?: FiscalModelPracticalGuideV1["officialLinks"];
  readonly documents?: FiscalModelPracticalGuideV1["documents"];
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
  readonly institutional?: boolean;
  readonly institutionalCitizenHelp?: readonly string[];
  readonly primaryActionLabel?: string;
  readonly allowCurrentFiling?: boolean;
  readonly effectiveYear?: number;
  readonly filingYear?: number;
  readonly requiresAnnualReview?: boolean;
}

const PRIVACY_NOTICE = {
  title: "Información oficial sin recoger datos personales",
  paragraphs: [
    "Factu explica el procedimiento y enlaza con la sede oficial. No recopila, firma, presenta ni transmite los datos de este modelo.",
  ],
} as const;

const INSTITUTIONAL_NOTICE = {
  title: "No lo presenta el ciudadano",
  paragraphs: [
    "Lo presenta una Administración o entidad pública autorizada. El suministro no genera por sí mismo un impuesto al ciudadano.",
    "Si tus datos son incorrectos, solicita la corrección al organismo que los emitió; no presentes personalmente este modelo institucional.",
  ],
} as const;

export function createFinalPracticalGuideV1(
  spec: FinalGuideSpecV1,
): FiscalModelPracticalGuideV1 {
  if (spec.related.length === 0) {
    throw new Error(`Model ${spec.code} needs a related model`);
  }
  if (spec.specificFaq.length < 4 || spec.commonMistakes.length < 3) {
    throw new Error(`Model ${spec.code} needs deep FAQ and mistake coverage`);
  }

  const related = spec.related[0];
  const sourceIds = [
    spec.procedureSourceId,
    spec.recordSourceId,
    ...(spec.legalLinks ?? []).flatMap((item) => item.sourceId ?? []),
    ...(spec.officialLinks ?? []).flatMap((item) => item.sourceId ?? []),
    ...(spec.documents ?? []).map((item) => item.sourceId),
  ];

  const actions: FiscalModelPracticalGuideV1["actions"] = spec.institutional
    ? [
        {
          label: "Entender para qué se utiliza",
          sourceId: spec.procedureSourceId,
          primary: true,
        },
        {
          label: "Consultar el procedimiento institucional",
          sourceId: spec.recordSourceId,
        },
        {
          label: "Comprobar qué organismo debe corregir mis datos",
          sourceId: spec.recordSourceId,
        },
      ]
    : [
        {
          label:
            spec.primaryActionLabel ??
            (spec.allowCurrentFiling === false
              ? "Consultar gestiones de ejercicios históricos"
              : `Abrir el trámite oficial del ${spec.code}`),
          sourceId: spec.procedureSourceId,
          primary: true,
        },
        {
          label: "Consultar la ficha administrativa oficial",
          sourceId: spec.recordSourceId,
        },
        {
          label: `Ver la ficha relacionada del ${related.code}`,
          internalHref: related.href,
        },
      ];

  const institutionalSection: FiscalModelPracticalGuideV1["sections"] =
    spec.institutional
      ? [
          {
            id: `model-${spec.code}-institutional-audiences`,
            title: "Quién suministra los datos y qué debe hacer el ciudadano",
            cards: [
              {
                title: "Para la Administración declarante",
                paragraphs: [spec.presenter, spec.channel],
                bullets: [
                  "Debe utilizar el diseño, ejercicio y canal institucional vigentes.",
                  "Las altas, modificaciones y bajas se realizan por el cauce publicado por la AEAT.",
                  "El suministro debe respetar la competencia, el formato y la protección de datos.",
                ],
              },
              {
                title: "Para el ciudadano afectado",
                paragraphs: [spec.nonPresenter],
                bullets: spec.institutionalCitizenHelp ?? [
                  "Comprueba el dato en la resolución, certificado o documento emitido por el organismo.",
                  "Solicita la rectificación a la Administración que originó la información.",
                  "Conserva la respuesta y revisa tu propia declaración si el dato tenía efecto en ella.",
                ],
              },
            ],
          },
        ]
      : [];

  return {
    code: spec.code,
    editorialCategory: spec.category,
    statusLabel: spec.statusLabel,
    statusTone: spec.statusTone,
    effectiveYear: spec.effectiveYear,
    filingYear: spec.filingYear,
    lastVerifiedAt: "2026-07-15",
    requiresAnnualReview: spec.requiresAnnualReview ?? true,
    externalActionNotice:
      "La información y los trámites se abren en la sede oficial. Factu no recoge datos, no firma, no presenta y no transmite este modelo a la Agencia Tributaria.",
    intro: spec.intro,
    notices: [
      ...(spec.institutional ? [INSTITUTIONAL_NOTICE] : []),
      ...spec.notices,
      PRIVACY_NOTICE,
    ],
    actions,
    quickSummaryTitle: `${spec.code} en pocas palabras`,
    quickFacts: [
      { label: "Tipo", value: spec.declarationType },
      { label: "Quién lo presenta", value: spec.presenter },
      { label: "Quién no lo presenta", value: spec.nonPresenter },
      { label: "Periodicidad", value: spec.periodicity },
      { label: "Plazo", value: spec.deadline },
      { label: "Efecto", value: spec.result },
    ],
    sections: [
      ...institutionalSection,
      {
        id: `model-${spec.code}-scope`,
        title: "Qué incluye y qué queda fuera",
        cards: [
          { title: "Incluye", bullets: spec.included },
          { title: "No incluye ni sustituye", bullets: spec.excluded },
        ],
      },
      {
        id: `model-${spec.code}-filing`,
        title: "Periodicidad, plazo, canal y efecto",
        cards: [
          { title: "Cuándo", paragraphs: [spec.periodicity, spec.deadline] },
          {
            title: "Cómo y con qué efecto",
            paragraphs: [spec.channel, spec.result],
          },
        ],
        note: "Comprueba siempre el ejercicio y el diseño vigente en la sede oficial antes de actuar.",
      },
      {
        id: `model-${spec.code}-prepare`,
        title: "Documentación, controles y errores frecuentes",
        cards: [
          { title: "Prepara y comprueba", bullets: spec.preparation },
          { title: "Evita estos errores", bullets: spec.commonMistakes },
        ],
      },
      ...(spec.extraSections ?? []),
    ],
    fillingTitle: spec.institutional
      ? `Cómo funciona el suministro institucional ${spec.code}`
      : `Guía práctica para preparar el ${spec.code}`,
    fillingSteps: spec.institutional
      ? [
          {
            title: "1. Confirma el organismo competente",
            paragraphs: [spec.presenter, spec.nonPresenter],
          },
          {
            title: "2. Utiliza el diseño del ejercicio",
            paragraphs: [
              "Valida tipos de registro, campos, claves, longitudes, fechas y formato contra la documentación institucional vigente.",
            ],
          },
          {
            title: "3. Presenta o modifica por el canal institucional",
            paragraphs: [spec.channel, spec.deadline],
          },
          {
            title: "4. Corrige en el organismo de origen",
            paragraphs: [spec.correction],
          },
        ]
      : [
          {
            title: "1. Confirma que el trámite te corresponde",
            paragraphs: [spec.presenter, spec.nonPresenter],
          },
          {
            title: "2. Fija periodo, plazo y supuesto legal",
            paragraphs: [spec.periodicity, spec.deadline],
          },
          {
            title: "3. Reúne la prueba completa",
            paragraphs: [
              "No avances solo por encajar en una descripción general: deben cumplirse todos los requisitos del supuesto aplicable.",
            ],
            bullets: spec.preparation,
          },
          {
            title: "4. Utiliza el canal oficial",
            paragraphs: [spec.channel],
          },
          {
            title: "5. Conserva justificante y respuesta",
            paragraphs: [
              "La presentación no garantiza por sí sola una devolución, exención, modificación o efecto jurídico.",
            ],
          },
        ],
    afterTitle: spec.institutional
      ? "Consulta, corrección y efecto para la persona afectada"
      : "Después de la presentación o consulta",
    afterSteps: [
      {
        title: "Conserva la evidencia",
        description:
          "Guarda justificante, documentación de soporte y respuesta oficial.",
      },
      { title: "Comprueba el efecto", description: spec.result },
      { title: "Corrige por el cauce correcto", description: spec.correction },
    ],
    comparison: {
      title: `${spec.code} y modelos relacionados`,
      current: { title: spec.code, description: spec.intro[0] },
      related: {
        title: related.code,
        description: related.description,
        href: related.href,
        label: `Ver ${related.code}`,
      },
      additional: spec.related.slice(1).map((item) => ({
        title: item.code,
        description: item.description,
        href: item.href,
        label: `Ver ${item.code}`,
      })),
      conclusion:
        "Que dos modelos estén relacionados no significa que los presente la misma persona ni que uno sustituya automáticamente al otro.",
    },
    pdfNotice: [
      "Los formularios, manuales y diseños son documentos oficiales de consulta: comprueba siempre el ejercicio.",
      "Factu no almacena los documentos ni los datos personales asociados a este procedimiento.",
    ],
    documents: spec.documents ?? [],
    officialLinks: spec.officialLinks ?? [],
    legalLinks: spec.legalLinks ?? [],
    faq: [
      { question: "¿Quién lo presenta?", answer: spec.presenter },
      { question: "¿Quién no debe presentarlo?", answer: spec.nonPresenter },
      { question: "¿Con qué periodicidad funciona?", answer: spec.periodicity },
      { question: "¿Cuál es el plazo?", answer: spec.deadline },
      { question: "¿Qué efecto produce?", answer: spec.result },
      { question: "¿Cómo se corrige un error?", answer: spec.correction },
      ...spec.specificFaq,
    ],
    sourceIds: [...new Set(sourceIds)],
  };
}
