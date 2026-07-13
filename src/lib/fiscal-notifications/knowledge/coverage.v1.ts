import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1,
  type FiscalNotificationDocumentFamilyIdV1,
} from "./document-families.v1";
import { FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1 } from "./official-sources.v1";

export const FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SCHEMA_VERSION_V1 =
  1 as const;
export const FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_RELEASE_ID_V1 =
  "fiscal-notification-knowledge-coverage.2026-07-12.v1" as const;

export type FiscalNotificationKnowledgeCoverageStatusV1 =
  | "PARTIAL_REVIEW_ONLY"
  | "MISSING";

export type FiscalNotificationKnowledgeBlockerV1 =
  | "OFFICIAL_CONTEXT_SOURCE_MISSING"
  | "OFFICIAL_SOURCE_REGISTRATION_PENDING"
  | "SOURCE_CONTENT_HASH_MISSING"
  | "TEMPLATE_VARIANT_NOT_REGISTERED"
  | "SYNTHETIC_FIXTURE_MISSING"
  | "CANDIDATE_HANDLER_MISSING"
  | "EXPLICIT_FACT_EXTRACTOR_MISSING"
  | "LEGAL_REVIEW_PENDING"
  | "OPERATIONAL_ACTIVATION_PROHIBITED";

export interface FiscalNotificationFamilyCoverageV1 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV1;
  readonly status: FiscalNotificationKnowledgeCoverageStatusV1;
  readonly officialContextSourceCount: number;
  readonly candidateHandlerImplemented: boolean;
  readonly explicitFactExtractorImplemented: boolean;
  readonly syntheticTestCaseAvailable: boolean;
  readonly templateVariantRegistered: false;
  readonly legalRuleActive: false;
  readonly operationalActionActive: false;
  readonly blockers: readonly FiscalNotificationKnowledgeBlockerV1[];
}

function coverageFor(
  family: (typeof FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1)[number],
): FiscalNotificationFamilyCoverageV1 {
  const blockers: FiscalNotificationKnowledgeBlockerV1[] = [];
  if (family.sourceIds.length === 0) {
    blockers.push("OFFICIAL_CONTEXT_SOURCE_MISSING");
  }
  if (
    family.evidenceOrigin === "OFFICIAL_SOURCE_REPORTED_PENDING_REGISTRATION"
  ) {
    blockers.push("OFFICIAL_SOURCE_REGISTRATION_PENDING");
  }
  blockers.push(
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
    blockers: Object.freeze(blockers),
  });
}

export const FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map(coverageFor),
) satisfies readonly FiscalNotificationFamilyCoverageV1[];

const familiesWithOfficialContext = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1
  .filter((family) => family.sourceIds.length > 0).length;

export const FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V1 = Object.freeze({
  schemaVersion: FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SCHEMA_VERSION_V1,
  releaseId: FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_RELEASE_ID_V1,
  familyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.length,
  sourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1.length,
  urlVerifiedSourceCount: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1.length,
  contentHashVerifiedSourceCount: 0,
  legallyReviewedSourceCount: 0,
  observedCorpusFamilyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
    (family) =>
      family.evidenceOrigin === "ANONYMIZED_PRIVATE_CORPUS_OBSERVATION",
  ).length,
  officialOnlyFamilyCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
    (family) =>
      family.evidenceOrigin === "OFFICIAL_SOURCE_ONLY_VERIFIED_URL",
  ).length,
  officialSourcePendingRegistrationFamilyCount:
    FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
      (family) =>
        family.evidenceOrigin ===
        "OFFICIAL_SOURCE_REPORTED_PENDING_REGISTRATION",
  ).length,
  familiesWithOfficialContext,
  familiesMissingOfficialContext:
    FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.length -
    familiesWithOfficialContext,
  candidateHandlerCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
    (family) => family.recognition !== null,
  ).length,
  explicitFactExtractorCount:
    FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
      (family) => family.recognition?.explicitFactExtractor,
    ).length,
  syntheticTestCaseCount: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.filter(
    (family) => family.fixtureStatus === "SYNTHETIC_TEST_CASE_AVAILABLE",
  ).length,
  registeredTemplateVariantCount: 0,
  activeLegalRuleCount: 0,
  activeOperationalActionCount: 0,
  partialReviewOnlyFamilyCount: FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1.filter(
    (entry) => entry.status === "PARTIAL_REVIEW_ONLY",
  ).length,
  missingFamilyCount: FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1.filter(
    (entry) => entry.status === "MISSING",
  ).length,
  completeFamilyCount: 0,
  overallStatus: "REVIEW_ONLY_INCOMPLETE" as const,
  requiresHumanReview: true as const,
  materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
});

const coverageByFamilyId = new Map(
  FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1.map((entry) => [
    entry.familyId,
    entry,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationFamilyCoverageV1(
  familyId: unknown,
): FiscalNotificationFamilyCoverageV1 | null {
  return typeof familyId === "string" &&
    familyId.length > 0 &&
    familyId.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(familyId)
    ? (coverageByFamilyId.get(
        familyId as FiscalNotificationDocumentFamilyIdV1,
      ) ?? null)
    : null;
}
