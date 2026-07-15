import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialAccessMethodsV1,
  type PublicAeatOfficialContentFaqItemV1,
  type PublicAeatOfficialContentLinkV1,
  type PublicAeatOfficialContentSectionV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1 = "2026-07-14" as const;

const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

export interface PublicAeatBatch18ModelInputV1<Code extends string> {
  readonly releaseId: string;
  readonly reviewedOn?: string;
  readonly lifecycleStatus?: PublicAeatOfficialModelContentV1["lifecycleStatus"];
  readonly code: Code;
  readonly canonicalName: string;
  readonly summary: string;
  readonly searchTerms: readonly [string, ...string[]];
  readonly sources: readonly [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  readonly purpose: string;
  readonly scope: string;
  readonly access: string;
  readonly details: string;
  readonly faq: readonly [
    Readonly<{
      id: string;
      question: string;
      answer: string;
      sourceIds: readonly [string, ...string[]];
    }>,
    ...Readonly<{
      id: string;
      question: string;
      answer: string;
      sourceIds: readonly [string, ...string[]];
    }>[],
  ];
  readonly accessMethods: PublicAeatOfficialAccessMethodsV1;
}

export function definePublicAeatBatch18SourceV1(
  source: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentSourceV1 {
  return source;
}

export function createPublicAeatBatch18StandardFaqV1(
  code: string,
  what: string,
  channel: string,
  audience: string,
  material: string,
  legal: string,
  sourceIds: readonly [string, ...string[]],
) {
  return [
    {
      id: "what",
      question: `¿Qué es el Modelo ${code}?`,
      answer: what,
      sourceIds,
    },
    {
      id: "channel",
      question: "¿Qué canal oficial publica la AEAT?",
      answer: channel,
      sourceIds,
    },
    {
      id: "audience",
      question: "¿A quién se dirige la información oficial?",
      answer: audience,
      sourceIds,
    },
    {
      id: "material",
      question: "¿Qué documentación oficial puede consultarse?",
      answer: material,
      sourceIds,
    },
    {
      id: "legal",
      question: "¿Qué referencia normativa consta en la ficha?",
      answer: legal,
      sourceIds,
    },
    {
      id: "applicability",
      question: "¿Esta página confirma que debo utilizar este modelo?",
      answer:
        "No. Resume información pública de AEAT y BOE, pero no evalúa circunstancias personales ni confirma una obligación concreta.",
      sourceIds,
    },
  ] as const;
}

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function sourceLink(
  source: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentLinkV1 {
  return {
    id: `${source.id}.link`,
    label: source.title,
    sourceId: source.id,
    category:
      source.kind === "LEGAL_TEXT"
        ? "LEGAL"
        : source.kind === "PROCEDURE_HOME" || source.kind === "PROCEDURE_RECORD"
          ? "PROCEDURE"
          : "INFORMATION",
    policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
  };
}

export function definePublicAeatBatch18ModelV1<const Code extends string>(
  input: PublicAeatBatch18ModelInputV1<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  const allSourceIds = input.sources.map((source) => source.id) as [
    string,
    ...string[],
  ];
  const facts = [
    [
      "purpose",
      "Finalidad oficial",
      "PURPOSE",
      `Qué identifica la AEAT como Modelo ${input.code}`,
      input.purpose,
    ],
    [
      "scope",
      "Ámbito descrito",
      "SCOPE",
      "Alcance de la información oficial",
      input.scope,
    ],
    [
      "access",
      "Canal oficial",
      "ACCESS",
      "Cómo se ofrece en la Sede electrónica",
      input.access,
    ],
    [
      "details",
      "Documentación y referencias",
      "DETAILS",
      "Material oficial registrado",
      input.details,
    ],
  ] as const;
  const sectionFromFact = (fact: (typeof facts)[number]) => {
    const [id, title, kind, heading, text] = fact;
    return {
      id: `model-${input.code}-${id}`,
      title,
      kind,
      items: [
        {
          id: `model-${input.code}-${id}-item`,
          heading,
          text,
          sourceIds: allSourceIds,
          semantics: "OFFICIAL_INFORMATION_ONLY" as const,
        },
      ],
    } satisfies PublicAeatOfficialContentSectionV1;
  };
  const sections = [
    sectionFromFact(facts[0]),
    sectionFromFact(facts[1]),
    sectionFromFact(facts[2]),
    sectionFromFact(facts[3]),
  ] as const;

  return deepFreeze({
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId: input.releaseId,
    code: input.code,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: input.lifecycleStatus ?? "UNDETERMINED",
    reviewedOn: input.reviewedOn ?? PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
    canonicalName: input.canonicalName,
    summary: input.summary,
    searchTerms: input.searchTerms,
    sections,
    sources: input.sources,
    documents: [],
    thumbnail: null,
    links: input.sources.map(sourceLink),
    faq: input.faq.map((item) => ({
      id: `model-${input.code}-faq-${item.id}`,
      question: item.question,
      answer: item.answer,
      sourceIds: item.sourceIds,
      semantics: "OFFICIAL_INFORMATION_ONLY" as const,
    })) as [
      PublicAeatOfficialContentFaqItemV1,
      ...PublicAeatOfficialContentFaqItemV1[],
    ],
    accessMethods: input.accessMethods,
    externalNavigation: null,
    limitations: LIMITATIONS,
  });
}
