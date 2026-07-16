import {
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_RELATION_TYPES_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  type AeatDocumentRelationTypeIdV1,
} from "./knowledge/aeat-document-knowledge.v1";

export const FISCAL_NOTIFICATION_RELATION_EXPLANATION_VERSION_V2 =
  "2.0.0" as const;

export const FISCAL_NOTIFICATION_RELATION_STATUSES_V2 = Object.freeze([
  "SYSTEM_CONFIRMED_EXACT",
  "USER_CONFIRMED",
  "SUGGESTED",
] as const);

export type FiscalNotificationRelationStatusV2 =
  (typeof FISCAL_NOTIFICATION_RELATION_STATUSES_V2)[number];
export type FiscalNotificationExplanationRelationTypeIdV2 =
  AeatDocumentRelationTypeIdV1;

export const FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2 =
  AEAT_DOCUMENT_KNOWLEDGE_V1.globalPolicy.explanationUi
    .suggestedRelationOnlyPhrase;

export const FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2 =
  "Los documentos comparten una referencia oficial exacta compatible. Esto confirma únicamente el vínculo documental; cualquier efecto o estado requiere evidencia impresa." as const;

export const FISCAL_NOTIFICATION_USER_LINK_NEUTRAL_PHRASE_V2 =
  "El usuario confirmó el vínculo entre los documentos. Esta confirmación no acredita por sí sola ningún efecto o estado." as const;

export interface FiscalNotificationRelationExplanationCatalogEntryV2 {
  readonly relationType: FiscalNotificationExplanationRelationTypeIdV2;
  readonly exactPhrase: string;
  readonly registeredSuggestedPhrase: string;
  readonly exactPhraseRequiresPrintedEffect: true;
}

export const FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2 =
  Object.freeze(
    AEAT_DOCUMENT_RELATION_TYPE_IDS_V1.map((relationType) =>
      Object.freeze({
        relationType,
        exactPhrase: AEAT_DOCUMENT_RELATION_TYPES_V1[relationType].exactPhrase,
        registeredSuggestedPhrase:
          AEAT_DOCUMENT_RELATION_TYPES_V1[relationType].suggestedPhrase,
        exactPhraseRequiresPrintedEffect: true as const,
      }),
    ),
  ) satisfies readonly FiscalNotificationRelationExplanationCatalogEntryV2[];

const RELATION_TYPE_SET = new Set<string>(
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
);
const RELATION_STATUS_SET = new Set<string>(
  FISCAL_NOTIFICATION_RELATION_STATUSES_V2,
);

export class FiscalNotificationRelationExplanationErrorV2 extends Error {
  readonly code = "INVALID_FISCAL_NOTIFICATION_RELATION_EXPLANATION_V2" as const;

  constructor(readonly path: string) {
    super(`Invalid fiscal notification relation explanation at ${path}`);
    this.name = "FiscalNotificationRelationExplanationErrorV2";
  }
}

function invalid(path: string): never {
  throw new FiscalNotificationRelationExplanationErrorV2(path);
}

export function isFiscalNotificationExplanationRelationTypeV2(
  value: unknown,
): value is FiscalNotificationExplanationRelationTypeIdV2 {
  return typeof value === "string" && RELATION_TYPE_SET.has(value);
}

export function isFiscalNotificationRelationStatusV2(
  value: unknown,
): value is FiscalNotificationRelationStatusV2 {
  return typeof value === "string" && RELATION_STATUS_SET.has(value);
}

export interface ExplainFiscalNotificationRelationInputV2 {
  readonly relationType: unknown;
  readonly status: unknown;
  readonly exactReferenceConfirmed: boolean;
  readonly userConfirmed: boolean;
  readonly printedEffectProven: boolean;
}

export interface FiscalNotificationRelationExplanationV2 {
  readonly version: typeof FISCAL_NOTIFICATION_RELATION_EXPLANATION_VERSION_V2;
  readonly relationType: FiscalNotificationExplanationRelationTypeIdV2;
  readonly status: FiscalNotificationRelationStatusV2;
  readonly statusLabel: string;
  readonly phrase: string;
  readonly phraseSource:
    | "GLOBAL_SUGGESTED_PHRASE"
    | "REGISTERED_EXACT_PHRASE"
    | "NEUTRAL_CONFIRMED_LINK_PHRASE";
  readonly linkConfirmation:
    | "NOT_CONFIRMED"
    | "EXACT_REFERENCE"
    | "USER_CONFIRMED";
  readonly effectAssertion:
    | "NOT_ASSERTED"
    | "EXPLICIT_IN_DOCUMENT";
  readonly requiresHumanReview: true;
  readonly automaticEffect: "NONE";
  readonly materializationPolicy: "PROHIBITED";
}

function validateBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") invalid(path);
}

function validateCatalog(): void {
  if (
    AEAT_DOCUMENT_KNOWLEDGE_V1.meta.relationTypeCount !== 48 ||
    FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2.length !== 48 ||
    new Set(
      FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2.map(
        (entry) => entry.relationType,
      ),
    ).size !== 48
  ) {
    invalid("catalog");
  }
  for (const relationType of AEAT_DOCUMENT_RELATION_TYPE_IDS_V1) {
    const entry = FISCAL_NOTIFICATION_RELATION_EXPLANATION_CATALOG_V2.find(
      (candidate) => candidate.relationType === relationType,
    );
    if (
      !entry ||
      entry.exactPhrase.length === 0 ||
      entry.registeredSuggestedPhrase.length === 0
    ) {
      invalid(`catalog.${relationType}`);
    }
  }
  if (
    FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2 !==
    AEAT_DOCUMENT_KNOWLEDGE_V1.globalPolicy.explanationUi
      .suggestedRelationOnlyPhrase
  ) {
    invalid("suggestedPhrase");
  }
}

validateCatalog();

export function explainFiscalNotificationRelationV2(
  input: ExplainFiscalNotificationRelationInputV2,
): FiscalNotificationRelationExplanationV2 {
  if (!isFiscalNotificationExplanationRelationTypeV2(input.relationType)) {
    return invalid("relationType");
  }
  if (!isFiscalNotificationRelationStatusV2(input.status)) {
    return invalid("status");
  }
  validateBoolean(input.exactReferenceConfirmed, "exactReferenceConfirmed");
  validateBoolean(input.userConfirmed, "userConfirmed");
  validateBoolean(input.printedEffectProven, "printedEffectProven");

  if (
    input.status === "SYSTEM_CONFIRMED_EXACT" &&
    !input.exactReferenceConfirmed
  ) {
    return invalid("exactReferenceConfirmed");
  }
  if (input.status === "USER_CONFIRMED" && !input.userConfirmed) {
    return invalid("userConfirmed");
  }

  const statusLabel =
    AEAT_DOCUMENT_KNOWLEDGE_V1.globalPolicy.explanationUi.relationStatusLabels[
      input.status
    ];

  if (input.status === "SUGGESTED") {
    return Object.freeze({
      version: FISCAL_NOTIFICATION_RELATION_EXPLANATION_VERSION_V2,
      relationType: input.relationType,
      status: input.status,
      statusLabel,
      phrase: FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
      phraseSource: "GLOBAL_SUGGESTED_PHRASE",
      linkConfirmation: "NOT_CONFIRMED",
      effectAssertion: "NOT_ASSERTED",
      requiresHumanReview: true,
      automaticEffect: "NONE",
      materializationPolicy: "PROHIBITED",
    });
  }

  if (!input.printedEffectProven) {
    return Object.freeze({
      version: FISCAL_NOTIFICATION_RELATION_EXPLANATION_VERSION_V2,
      relationType: input.relationType,
      status: input.status,
      statusLabel,
      phrase:
        input.status === "SYSTEM_CONFIRMED_EXACT"
          ? FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2
          : FISCAL_NOTIFICATION_USER_LINK_NEUTRAL_PHRASE_V2,
      phraseSource: "NEUTRAL_CONFIRMED_LINK_PHRASE",
      linkConfirmation:
        input.status === "SYSTEM_CONFIRMED_EXACT"
          ? "EXACT_REFERENCE"
          : "USER_CONFIRMED",
      effectAssertion: "NOT_ASSERTED",
      requiresHumanReview: true,
      automaticEffect: "NONE",
      materializationPolicy: "PROHIBITED",
    });
  }

  return Object.freeze({
    version: FISCAL_NOTIFICATION_RELATION_EXPLANATION_VERSION_V2,
    relationType: input.relationType,
    status: input.status,
    statusLabel,
    phrase: AEAT_DOCUMENT_RELATION_TYPES_V1[input.relationType].exactPhrase,
    phraseSource: "REGISTERED_EXACT_PHRASE",
    linkConfirmation:
      input.status === "SYSTEM_CONFIRMED_EXACT"
        ? "EXACT_REFERENCE"
        : "USER_CONFIRMED",
    effectAssertion: "EXPLICIT_IN_DOCUMENT",
    requiresHumanReview: true,
    automaticEffect: "NONE",
    materializationPolicy: "PROHIBITED",
  });
}

export const buildFiscalNotificationRelationExplanationV2 =
  explainFiscalNotificationRelationV2;
export const resolveFiscalNotificationRelationExplanationV2 =
  explainFiscalNotificationRelationV2;
