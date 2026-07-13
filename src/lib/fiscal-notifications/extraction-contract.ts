import type { AdministrativeDocumentType } from "./types";
export const FISCAL_NOTIFICATION_EXTRACTION_SCHEMA_VERSION = 1 as const;
export const FISCAL_NOTIFICATION_EXTRACTION_ENGINE_ID =
  "fiscal-notification-family-candidate-engine" as const;
export const FISCAL_NOTIFICATION_EXTRACTION_ENGINE_VERSION = "1.1.0" as const;

export type FiscalNotificationSupportedFamilyId =
  | "AEAT_ENFORCEMENT_ORDER_CANDIDATE"
  | "AEAT_DEFERRAL_GRANT_CANDIDATE";

export type FiscalNotificationAnchorId =
  | "AEAT_AUTHORITY_LABEL"
  | "AEAT_OFFICIAL_DOMAIN_LABEL"
  | "STRUCTURAL_FIRST_PAGE_HEADER"
  | "ENFORCEMENT_ORDER_TITLE"
  | "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION"
  | "ENFORCEMENT_DEBT_AMOUNT_SECTION"
  | "DEFERRAL_GRANT_TITLE"
  | "DEFERRAL_INSTALLMENT_ANNEX"
  | "DEFERRAL_INTEREST_CALCULATION"
  | "CONFLICTING_AUTHORITY_TGSS"
  | "CONFLICTING_TERRITORY_CANARY"
  | "CONFLICTING_TERRITORY_FORAL"
  | "CONFLICTING_TERRITORY_REGIONAL"
  | "CONFLICTING_TERRITORY_CEUTA_MELILLA"
  | "CONFLICTING_NON_DOCUMENT_GUIDE";

export interface FiscalNotificationAnchorEvidence {
  readonly anchorId: FiscalNotificationAnchorId;
  readonly pageNumbers: readonly number[];
}

export type FiscalNotificationCandidateSignalStatus =
  | "COMPLETE_REQUIRED_ANCHORS"
  | "INCOMPLETE_REQUIRED_ANCHORS"
  | "CONFLICTING_AUTHORITY_OR_TERRITORY"
  | "CONFLICTING_DOCUMENT_SIGNAL";

export interface FiscalNotificationFamilyCandidate {
  readonly familyId: FiscalNotificationSupportedFamilyId;
  readonly documentType: Extract<
    AdministrativeDocumentType,
    "AEAT_ENFORCEMENT_ORDER" | "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT"
  >;
  readonly authoritySignal: "AEAT_UNVERIFIED";
  readonly handlerId:
    | "aeat-enforcement-order-candidate"
    | "aeat-deferral-grant-candidate";
  readonly handlerVersion: "1.0.0";
  readonly signalStatus: FiscalNotificationCandidateSignalStatus;
  readonly matchedAnchors: readonly FiscalNotificationAnchorEvidence[];
  readonly missingRequiredAnchorIds: readonly FiscalNotificationAnchorId[];
  readonly conflictingAnchorIds: readonly FiscalNotificationAnchorId[];
  readonly requiresHumanReview: true;
}

export type FiscalNotificationExtractionReason =
  | "SUPPORTED_FAMILY_CANDIDATE"
  | "PARTIAL_SUPPORTED_FAMILY_SIGNAL"
  | "AMBIGUOUS_SUPPORTED_FAMILIES"
  | "CONFLICTING_AUTHORITY_OR_TERRITORY"
  | "CONFLICTING_DOCUMENT_SIGNAL"
  | "NO_SUPPORTED_FAMILY_SIGNAL"
  | "NO_EXTRACTABLE_TEXT"
  | "INCONSISTENT_PAGE_STATE"
  | "UNSUPPORTED_TEXT_CONTROLS"
  | "NORMALIZED_TEXT_LIMIT_EXCEEDED"
  | "TEXT_LINE_LIMIT_EXCEEDED";

export interface FiscalNotificationExtractionResult {
  readonly schemaVersion: 1;
  readonly engineId: "fiscal-notification-family-candidate-engine";
  readonly engineVersion: "1.1.0";
  readonly ownerScope: string;
  readonly documentId: string;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly reason: FiscalNotificationExtractionReason;
  readonly candidates: readonly FiscalNotificationFamilyCandidate[];
  readonly selectedFamilyId: null;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  readonly retainedSourceContent: "NONE";
}
