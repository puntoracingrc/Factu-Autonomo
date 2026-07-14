import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialAccessMethodsV1,
  type PublicAeatOfficialContentFaqItemV1,
  type PublicAeatOfficialContentLinkV1,
  type PublicAeatOfficialContentSectionV1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1 = "2026-07-14" as const;

const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

export type PublicAeatBatch17FactKindV1 =
  | "PURPOSE"
  | "SCOPE"
  | "ACCESS"
  | "DETAILS";

export interface PublicAeatBatch17FactV1 {
  readonly id: string;
  readonly title: string;
  readonly kind: PublicAeatBatch17FactKindV1;
  readonly heading: string;
  readonly text: string;
  readonly sourceIds: readonly [string, ...string[]];
}

export interface PublicAeatBatch17FaqV1 {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly sourceIds: readonly [string, ...string[]];
}

export interface PublicAeatBatch17ModelInputV1<Code extends string> {
  readonly releaseId: string;
  readonly code: Code;
  readonly lifecycleStatus?: "UNDETERMINED" | "HISTORICAL";
  readonly canonicalName: string;
  readonly summary: string;
  readonly searchTerms: readonly [string, ...string[]];
  readonly sources: readonly [
    PublicAeatOfficialContentSourceV1,
    ...PublicAeatOfficialContentSourceV1[],
  ];
  readonly facts: readonly [
    PublicAeatBatch17FactV1,
    ...PublicAeatBatch17FactV1[],
  ];
  readonly faq: readonly [PublicAeatBatch17FaqV1, ...PublicAeatBatch17FaqV1[]];
  readonly accessMethods?: PublicAeatOfficialAccessMethodsV1;
}

export function definePublicAeatBatch17SourceV1(
  source: PublicAeatOfficialContentSourceV1,
): PublicAeatOfficialContentSourceV1 {
  return source;
}

export function createPublicAeatBatch17StandardFactsV1(
  code: string,
  purpose: string,
  scope: string,
  access: string,
  details: string,
  sourceIds: readonly [string, ...string[]],
): readonly [PublicAeatBatch17FactV1, ...PublicAeatBatch17FactV1[]] {
  return [
    {
      id: "purpose",
      title: "Finalidad oficial",
      kind: "PURPOSE",
      heading: `Qué identifica la AEAT como Modelo ${code}`,
      text: purpose,
      sourceIds,
    },
    {
      id: "scope",
      title: "Ámbito descrito",
      kind: "SCOPE",
      heading: "Alcance de la información oficial",
      text: scope,
      sourceIds,
    },
    {
      id: "access",
      title: "Canal oficial",
      kind: "ACCESS",
      heading: "Cómo se ofrece en la Sede electrónica",
      text: access,
      sourceIds,
    },
    {
      id: "details",
      title: "Documentación y referencias",
      kind: "DETAILS",
      heading: "Material oficial registrado",
      text: details,
      sourceIds,
    },
  ];
}

export function createPublicAeatBatch17StandardFaqV1(
  code: string,
  what: string,
  channel: string,
  scope: string,
  material: string,
  legal: string,
  limit: string,
  sourceIds: readonly [string, ...string[]],
): readonly [PublicAeatBatch17FaqV1, ...PublicAeatBatch17FaqV1[]] {
  return [
    {
      id: "faq-what",
      question: `¿Qué es el Modelo ${code}?`,
      answer: what,
      sourceIds,
    },
    {
      id: "faq-channel",
      question: "¿Qué canal publica la AEAT?",
      answer: channel,
      sourceIds,
    },
    {
      id: "faq-scope",
      question: "¿Qué alcance refleja esta ficha?",
      answer: scope,
      sourceIds,
    },
    {
      id: "faq-material",
      question: "¿Qué material oficial puede consultarse?",
      answer: material,
      sourceIds,
    },
    {
      id: "faq-legal",
      question: "¿Qué referencia normativa consta?",
      answer: legal,
      sourceIds,
    },
    {
      id: "faq-limit",
      question: "¿Esta ficha decide si tengo que utilizarlo?",
      answer: limit,
      sourceIds,
    },
  ];
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
  const category =
    source.kind === "LEGAL_TEXT"
      ? "LEGAL"
      : source.kind === "PROCEDURE_HOME" || source.kind === "PROCEDURE_RECORD"
        ? "PROCEDURE"
        : "INFORMATION";
  return {
    id: `${source.id}.link`,
    label: source.title,
    sourceId: source.id,
    category,
    policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
  };
}

function sectionFromFact(
  code: string,
  fact: PublicAeatBatch17FactV1,
): PublicAeatOfficialContentSectionV1 {
  return {
    id: `model-${code}-${fact.id}`,
    title: fact.title,
    kind: fact.kind,
    items: [
      {
        id: `model-${code}-${fact.id}-item`,
        heading: fact.heading,
        text: fact.text,
        sourceIds: fact.sourceIds,
        semantics: "OFFICIAL_INFORMATION_ONLY",
      },
    ],
  };
}

function faqFromInput(
  code: string,
  faq: PublicAeatBatch17FaqV1,
): PublicAeatOfficialContentFaqItemV1 {
  return {
    id: `model-${code}-${faq.id}`,
    question: faq.question,
    answer: faq.answer,
    sourceIds: faq.sourceIds,
    semantics: "OFFICIAL_INFORMATION_ONLY",
  };
}

export function definePublicAeatBatch17ModelV1<const Code extends string>(
  input: PublicAeatBatch17ModelInputV1<Code>,
): PublicAeatOfficialModelContentV1<Code> {
  return deepFreeze({
    schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
    releaseId: input.releaseId,
    code: input.code,
    contentStatus: "OFFICIAL_INFORMATION",
    sourceVerificationStatus: "VERIFIED",
    applicabilityStatus: "NOT_EVALUATED",
    lifecycleStatus: input.lifecycleStatus ?? "UNDETERMINED",
    reviewedOn: PUBLIC_AEAT_BATCH_17_REVIEWED_ON_V1,
    canonicalName: input.canonicalName,
    summary: input.summary,
    searchTerms: input.searchTerms,
    sections: input.facts.map((fact) => sectionFromFact(input.code, fact)) as [
      PublicAeatOfficialContentSectionV1,
      ...PublicAeatOfficialContentSectionV1[],
    ],
    sources: input.sources,
    documents: [],
    thumbnail: null,
    links: input.sources.map(sourceLink),
    faq: input.faq.map((item) => faqFromInput(input.code, item)) as [
      PublicAeatOfficialContentFaqItemV1,
      ...PublicAeatOfficialContentFaqItemV1[],
    ],
    ...(input.accessMethods ? { accessMethods: input.accessMethods } : {}),
    externalNavigation: null,
    limitations: LIMITATIONS,
  });
}
