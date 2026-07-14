import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import type { AdministrativeEntityV1 } from "./domain.v1";
import type { DocumentSegmentV1 } from "./document-segment.v1";
import type { MonetaryComponentV1 } from "./monetary-component.v1";
import type { ProceduralDateV1 } from "./procedural-date.v1";
import type { ReferenceV1 } from "./reference.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
} from "./shared.v1";

export const BASE_EXTRACTOR_IDS_V1 = Object.freeze([
  "notification-envelope",
  "informative-communication",
  "identity-and-certificate",
  "census-resolution",
  "requirement",
  "assessment",
  "penalty",
  "deferral",
  "compensation",
  "refund",
  "seizure",
  "payment-order",
  "payment-evidence",
  "appeal-and-review",
  "liability",
  "inspection",
] as const);
export type BaseExtractorIdV1 = (typeof BASE_EXTRACTOR_IDS_V1)[number];

export interface FamilyExtractorBindingV1 {
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly extractorId: BaseExtractorIdV1;
  readonly extractorVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  readonly subtype: string;
  readonly variant: string;
  readonly additionalFieldIds: readonly string[];
  readonly classificationRuleIds: readonly string[];
  readonly presentationViewId: string;
  readonly implementationStatus:
    | "CONTRACT_ONLY"
    | "ADAPTER_REQUIRED"
    | "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY";
}
export interface ExtractorInputV1 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly segments: readonly DocumentSegmentV1[];
  readonly signal?: AbortSignal;
}

export interface ExtractorOutputV1 {
  readonly contractVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1;
  readonly extractorId: BaseExtractorIdV1;
  readonly extractorVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN" | "UNSUPPORTED" | "BLOCKED";
  readonly familyCandidates: readonly Readonly<{
    familyId: FiscalNotificationDocumentFamilyIdV3;
    confidence: number;
    matchingEvidenceIds: readonly string[];
    contradictoryEvidenceIds: readonly string[];
  }>[];
  readonly entities: readonly AdministrativeEntityV1[];
  readonly references: readonly ReferenceV1[];
  readonly monetaryComponents: readonly MonetaryComponentV1[];
  readonly proceduralDates: readonly ProceduralDateV1[];
  readonly warnings: readonly string[];
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly permitsDebtCreation: false;
  readonly permitsDeadlineCreation: false;
  readonly permitsPaymentAction: false;
  readonly permitsAccountingAction: false;
  readonly permitsAutomaticFamilyConfirmation: false;
}

export interface BaseExtractorV1 {
  readonly id: BaseExtractorIdV1;
  readonly version: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  extract(input: ExtractorInputV1): ExtractorOutputV1;
}

export function createEmptyExtractorOutputV1(
  extractorId: BaseExtractorIdV1,
  status: ExtractorOutputV1["status"] = "UNKNOWN",
): ExtractorOutputV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    releaseId: FISCAL_NOTIFICATION_EXTRACTOR_CORE_RELEASE_V1,
    extractorId,
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    status,
    familyCandidates: Object.freeze([]),
    entities: Object.freeze([]),
    references: Object.freeze([]),
    monetaryComponents: Object.freeze([]),
    proceduralDates: Object.freeze([]),
    warnings: Object.freeze([]),
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
    permitsAutomaticFamilyConfirmation: false,
  });
}
