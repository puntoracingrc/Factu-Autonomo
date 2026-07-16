import type { FiscalNotificationPlainLanguageGuidanceV1 } from "./plain-language-guidance.v1";
import {
  FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1,
} from "./plain-language-guidance.v1";
import {
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_PROFILES_V1,
  AEAT_NOTIFICATIONS_CANONICAL_URL_V1,
  type AeatDocumentOfficialSourceIdV1,
} from "../knowledge/aeat-document-knowledge.v1";
import {
  resolveFamilyExtractorBindingV1,
} from "../extractor-core/family-extractor-registry.v1";
import type { FiscalNotificationDocumentFamilyIdV2 } from "../knowledge/document-families.v2";

export const FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_ADAPTER_VERSION_V2 =
  "2.0.0" as const;

export type FiscalNotificationGuideRecognitionModeV2 =
  | "AUTOMATIC_REVIEW_ONLY"
  | "MANUAL_REVIEW_ONLY";
export type FiscalNotificationGuideRecognitionStatusV2 =
  | "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY"
  | "MANUAL_EXACT_SELECTION_ONLY";

export interface FiscalNotificationKnowledgeGuideSourceV2 {
  readonly sourceId: AeatDocumentOfficialSourceIdV1;
  readonly title: string;
  readonly authority: "AEAT" | "BOE" | "Gobierno de España";
  readonly sourceKind: "PROCEDURE_INFORMATION" | "LEGAL_TEXT";
  readonly canonicalUrl: string;
  readonly urlCheckedOn: "2026-07-16";
  readonly verificationStatus: "OFFICIAL_URL_VERIFIED";
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly usagePolicy: "CONTEXT_ONLY";
}

export interface FiscalNotificationKnowledgeGuidanceProjectionV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly recognitionMode: FiscalNotificationGuideRecognitionModeV2;
  readonly recognitionStatus: FiscalNotificationGuideRecognitionStatusV2;
  readonly guidance: FiscalNotificationPlainLanguageGuidanceV1;
  readonly sources: readonly FiscalNotificationKnowledgeGuideSourceV2[];
}

function sourceProjection(
  sourceId: AeatDocumentOfficialSourceIdV1,
): FiscalNotificationKnowledgeGuideSourceV2 | null {
  const source = AEAT_DOCUMENT_KNOWLEDGE_V1.officialSources[sourceId];
  const canonicalUrl =
    sourceId === "AEAT_NOTIFICATIONS"
      ? AEAT_NOTIFICATIONS_CANONICAL_URL_V1
      : source.url;
  if (!canonicalUrl || source.authority === "DOCUMENT") return null;
  return Object.freeze({
    sourceId,
    title: source.title,
    authority: source.authority,
    sourceKind:
      source.authority === "BOE"
        ? ("LEGAL_TEXT" as const)
        : ("PROCEDURE_INFORMATION" as const),
    canonicalUrl,
    urlCheckedOn: "2026-07-16",
    verificationStatus: "OFFICIAL_URL_VERIFIED",
    legalReviewStatus: "LEGAL_REVIEW_PENDING",
    usagePolicy: "CONTEXT_ONLY",
  });
}

function guidanceProjection(
  profile: (typeof AEAT_DOCUMENT_PROFILES_V1)[number],
): FiscalNotificationPlainLanguageGuidanceV1 {
  const searchTerms = Object.freeze([
    profile.nameEs,
    ...profile.id.split(/[._-]/u).filter(Boolean),
    ...profile.mustExtract.references,
    ...profile.mustExtract.dates,
    ...profile.mustExtract.money,
    ...profile.mustExtract.facts,
  ]);
  const keyPoints = Object.freeze([
    profile.plainLanguage.resultRule,
    ...profile.plainLanguage.nonComplianceContext,
    ...profile.plainLanguage.notProvenByThisDocument.map(
      (statement) => `Este documento no demuestra por sí solo: ${statement}`,
    ),
  ]);
  return Object.freeze({
    schemaVersion: 1,
    releaseId: FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_RELEASE_ID_V1,
    profileId: profile.id,
    profileVersion: "1.0.0",
    familyId: profile.id as FiscalNotificationDocumentFamilyIdV2,
    status: "GENERAL_CONTEXT_EXPLAINED",
    inShort: profile.plainLanguage.whatItIs,
    whyItUsuallyArrives: profile.plainLanguage.whyReceived,
    usualNextStep: profile.plainLanguage.nextStepRule,
    deadline: Object.freeze({
      title:
        profile.plainLanguage.deadlineRule.trigger === null
          ? "Comprueba si el documento fija algún plazo"
          : "Localiza la fecha que inicia el plazo",
      detail: `${profile.plainLanguage.deadlineRule.text} ${profile.plainLanguage.deadlineRule.fallback}`,
      basis: "RECEIPT_OR_DOCUMENT_ONLY",
    }),
    keyPoints,
    searchTerms,
    sourceIds: Object.freeze([]),
    documentPolicy: "DOCUMENT_IS_PRIMARY",
    networkPolicy: "NO_RUNTIME_NETWORK",
    inferencePolicy: "NO_DOCUMENT_SPECIFIC_INFERENCE",
    deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
    operationalPolicy: "INFORMATION_ONLY_NO_AUTOMATIC_ACTION",
  });
}

export const FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2 =
  Object.freeze(
    AEAT_DOCUMENT_PROFILES_V1.map((profile) => {
      const binding = resolveFamilyExtractorBindingV1(profile.id);
      if (!binding) throw new Error("Missing fiscal notification guide binding");
      const automatic =
        binding.implementationStatus === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY";
      return Object.freeze({
        familyId: profile.id as FiscalNotificationDocumentFamilyIdV2,
        recognitionMode: automatic
          ? ("AUTOMATIC_REVIEW_ONLY" as const)
          : ("MANUAL_REVIEW_ONLY" as const),
        recognitionStatus: automatic
          ? ("SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY" as const)
          : ("MANUAL_EXACT_SELECTION_ONLY" as const),
        guidance: guidanceProjection(profile),
        sources: Object.freeze(
          profile.officialSourceIds
            .map(sourceProjection)
            .filter(
              (
                source,
              ): source is FiscalNotificationKnowledgeGuideSourceV2 =>
                source !== null,
            ),
        ),
      });
    }),
  ) satisfies readonly FiscalNotificationKnowledgeGuidanceProjectionV2[];

const projectionByFamily = new Map(
  FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2.map((projection) => [
    projection.familyId,
    projection,
  ] as const),
);

export function resolveFiscalNotificationKnowledgeGuidanceV2(
  familyId: FiscalNotificationDocumentFamilyIdV2,
): FiscalNotificationKnowledgeGuidanceProjectionV2 {
  const projection = projectionByFamily.get(familyId);
  if (!projection) throw new Error("Missing fiscal notification guide projection");
  return projection;
}
