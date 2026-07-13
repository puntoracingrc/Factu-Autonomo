import {
  FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2,
  FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2,
  type FiscalNotificationDocumentFamilyIdV2,
} from "./document-families.v2";
import { FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2 } from "./official-sources.v2";

export const FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SCHEMA_VERSION_V2 =
  2 as const;
export const FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_RELEASE_ID_V2 =
  "fiscal-notification-knowledge-coverage.2026-07-13.v2" as const;

export type FiscalNotificationKnowledgeCoverageStatusV2 =
  | "PARTIAL_REVIEW_ONLY"
  | "MISSING";

export type FiscalNotificationKnowledgeBlockerV2 =
  | "OFFICIAL_CONTEXT_SOURCE_MISSING"
  | "OFFICIAL_CONTEXT_ONLY_NOT_A_RULE"
  | "SOURCE_CONTENT_HASH_MISSING"
  | "TEMPLATE_VARIANT_NOT_REGISTERED"
  | "SYNTHETIC_FIXTURE_MISSING"
  | "CANDIDATE_HANDLER_MISSING"
  | "EXPLICIT_FACT_EXTRACTOR_MISSING"
  | "LEGAL_REVIEW_PENDING"
  | "OPERATIONAL_ACTIVATION_PROHIBITED";

export interface FiscalNotificationFamilyCoverageV2 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV2;
  readonly status: FiscalNotificationKnowledgeCoverageStatusV2;
  readonly knowledgePriority: "V1_BASELINE" | "P0" | "P1";
  readonly officialContextSourceCount: number;
  readonly candidateHandlerImplemented: boolean;
  readonly explicitFactExtractorImplemented: boolean;
  readonly syntheticTestCaseAvailable: boolean;
  readonly templateVariantRegistered: false;
  readonly legalRuleActive: false;
  readonly operationalActionActive: false;
  readonly automaticRelationConfirmationActive: false;
  readonly blockers: readonly FiscalNotificationKnowledgeBlockerV2[];
}

function coverageFor(
  family: (typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2)[number],
): FiscalNotificationFamilyCoverageV2 {
  const blockers: FiscalNotificationKnowledgeBlockerV2[] = [];
  if (family.sourceIds.length === 0) {
    blockers.push("OFFICIAL_CONTEXT_SOURCE_MISSING");
  }
  blockers.push(
    "OFFICIAL_CONTEXT_ONLY_NOT_A_RULE",
    "SOURCE_CONTENT_HASH_MISSING",
    "TEMPLATE_VARIANT_NOT_REGISTERED",
  );
  if (family.fixtureStatus === "PENDING_SYNTHETIC_FIXTURE") {
    blockers.push("SYNTHETIC_FIXTURE_MISSING");
  }
  if (!family.recognition) {
    blockers.push("CANDIDATE_HANDLER_MISSING");
  }
  if (!family.recognition?.explicitFactExtractor) {
    blockers.push("EXPLICIT_FACT_EXTRACTOR_MISSING");
  }
  blockers.push("LEGAL_REVIEW_PENDING", "OPERATIONAL_ACTIVATION_PROHIBITED");

  return Object.freeze({
    familyId: family.id,
    status: family.recognition ? "PARTIAL_REVIEW_ONLY" : "MISSING",
    knowledgePriority: family.knowledgePriority,
    officialContextSourceCount: family.sourceIds.length,
    candidateHandlerImplemented: family.recognition !== null,
    explicitFactExtractorImplemented:
      family.recognition?.explicitFactExtractor !== null &&
      family.recognition?.explicitFactExtractor !== undefined,
    syntheticTestCaseAvailable:
      family.fixtureStatus === "SYNTHETIC_TEST_CASE_AVAILABLE",
    templateVariantRegistered: false,
    legalRuleActive: false,
    operationalActionActive: false,
    automaticRelationConfirmationActive: false,
    blockers: Object.freeze(blockers),
  });
}

export const FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map(coverageFor),
) satisfies readonly FiscalNotificationFamilyCoverageV2[];

const familiesWithOfficialContext = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2
  .filter((family) => family.sourceIds.length > 0).length;
const candidateHandlerCount = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
  (family) => family.recognition !== null,
).length;
const explicitFactExtractorCount = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2
  .filter((family) => family.recognition?.explicitFactExtractor).length;
const syntheticTestCaseCount = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
  (family) => family.fixtureStatus === "SYNTHETIC_TEST_CASE_AVAILABLE",
).length;

export const FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V2 = Object.freeze({
  schemaVersion: FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SCHEMA_VERSION_V2,
  releaseId: FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_RELEASE_ID_V2,
  familyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.length,
  v1BaselineFamilyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
    (family) => family.knowledgePriority === "V1_BASELINE",
  ).length,
  p0FamilyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
    (family) => family.knowledgePriority === "P0",
  ).length,
  p1FamilyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.filter(
    (family) => family.knowledgePriority === "P1",
  ).length,
  sourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.length,
  aeatSourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.filter(
    (source) => source.authority === "AEAT",
  ).length,
  boeSourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.filter(
    (source) => source.authority === "BOE",
  ).length,
  urlVerifiedSourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.length,
  contentHashVerifiedSourceCount: 0,
  legallyReviewedSourceCount: 0,
  familiesWithOfficialContext,
  familiesMissingOfficialContext:
    FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.length -
    familiesWithOfficialContext,
  candidateHandlerCount,
  explicitFactExtractorCount,
  syntheticTestCaseCount,
  registeredTemplateVariantCount: 0,
  activeLegalRuleCount: 0,
  activeOperationalActionCount: 0,
  automaticRelationConfirmationCount: 0,
  suggestedCausalRelationCount:
    FISCAL_NOTIFICATION_CAUSAL_RELATIONS_V2.length,
  prohibitedInferenceCount:
    FISCAL_NOTIFICATION_PROHIBITED_INFERENCE_IDS_V2.length,
  partialReviewOnlyFamilyCount: FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2.filter(
    (entry) => entry.status === "PARTIAL_REVIEW_ONLY",
  ).length,
  missingFamilyCount: FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2.filter(
    (entry) => entry.status === "MISSING",
  ).length,
  completeFamilyCount: 0,
  paymentFormIsPaymentReceipt: false as const,
  officialContextMayOverridePrintedDocument: false as const,
  overallStatus: "REVIEW_ONLY_INCOMPLETE" as const,
  requiresDocumentEvidence: true as const,
  requiresHumanReview: true as const,
  materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
});

const coverageByFamilyId = new Map(
  FISCAL_NOTIFICATION_FAMILY_COVERAGE_V2.map((entry) => [
    entry.familyId,
    entry,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationFamilyCoverageV2(
  familyId: unknown,
): FiscalNotificationFamilyCoverageV2 | null {
  return typeof familyId === "string" &&
    familyId.length > 0 &&
    familyId.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(familyId)
    ? (coverageByFamilyId.get(
        familyId as FiscalNotificationDocumentFamilyIdV2,
      ) ?? null)
    : null;
}
