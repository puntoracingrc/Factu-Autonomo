import type { AeatP0DeepExtractorOutcomeV10, AeatP0ExtractedFieldV10 } from "./extractor-core/p0-deep-extractor.v10";
import { AEAT_P0_DEEP_REVIEW_FIELD_LABELS_V10 } from "./p0-deep-review-labels.v10";
import {
  createEmptyFiscalNotificationVerticalSliceReviewV1,
  parseFiscalNotificationVerticalSliceReviewV1,
  type FiscalNotificationVerticalSliceReviewFieldV1,
  type FiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

export const AEAT_P0_DEEP_REVIEW_VERSION_V10 = "10.0.0" as const;

const REFERENCE_TYPES: Readonly<Record<string, FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]>> = Object.freeze({
  FILING_RECEIPT_ID: "FILING_RECEIPT_ID",
  ORIGINAL_FILING_RECEIPT_ID: "FILING_RECEIPT_ID",
  PROCEDURE_ID: "PROCEDURE_ID",
  ACT_ID: "ACT_ID",
  EXECUTION_ACT_ID: "ACT_ID",
  ORIGINAL_ACT_ID: "ACT_ID",
  REVIEW_RESOLUTION_ID: "ACT_ID",
  NOTIFICATION_ID: "NOTIFICATION_ID",
  ORIGINAL_DEBT_KEY: "DEBT_KEY",
  CERTIFICATE_ID: "OTHER_OFFICIAL_REFERENCE",
  REPLACEMENT_CERTIFICATE_ID: "OTHER_OFFICIAL_REFERENCE",
  FILING_JUSTIFICATION_NUMBER: "OTHER_OFFICIAL_REFERENCE",
  MODEL: "MODEL",
  FISCAL_YEAR: "FISCAL_YEAR",
  TAX_PERIOD: "TAX_PERIOD",
});

const DATE_TYPES: Readonly<Record<string, FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]>> = Object.freeze({
  ISSUE_DATE: "ISSUE_DATE",
  EFFECTIVE_NOTIFICATION_DATE: "EFFECTIVE_NOTIFICATION_DATE",
  CERTIFICATE_RECEIPT_DATE: "EFFECTIVE_NOTIFICATION_DATE",
  FILING_DATE: "ACTION_DATE",
  REFERENCE_DATE: "ACTION_DATE",
  REVIEW_RESOLUTION_ENTRY_DATE: "ACTION_DATE",
  ORIGINAL_DEADLINE: "RESPONSE_DEADLINE",
  NEW_DEADLINE: "RESPONSE_DEADLINE",
  RESPONSE_DEADLINE: "RESPONSE_DEADLINE",
  ALLEGATION_DEADLINE: "RESPONSE_DEADLINE",
  APPEAL_DEADLINE: "APPEAL_DEADLINE",
  VALID_UNTIL: "EXPIRATION_DATE",
});

const MONEY_TYPES: Readonly<Record<string, FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"]>> = Object.freeze({
  ORIGINAL_RESULT: "OTHER",
  REQUESTED_RESULT: "OTHER",
  REQUESTED_REFUND: "REFUND_REQUESTED",
  PROPOSED_REFUND: "REFUND_REQUESTED",
  PROPOSED_DEBT_ADJUSTMENT: "OTHER",
  RECOGNIZED_REFUND: "REFUND_RECOGNIZED",
  ADJUSTED_DEBT: "TOTAL_PENDING",
  INTEREST: "LATE_INTEREST",
  PREVIOUS_RESULT: "OTHER",
  RECTIFIED_RESULT: "OTHER",
  DIFFERENCE: "OTHER",
  CANCELLED_AMOUNT: "OTHER",
  NEW_AMOUNT: "OTHER",
  REFUND_AMOUNT: "REFUND_RECOGNIZED",
});

function canonicalType(field: AeatP0ExtractedFieldV10): FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"] {
  if (field.kind === "REFERENCE") return REFERENCE_TYPES[field.fieldCode] ?? "OTHER_OFFICIAL_REFERENCE";
  if (field.kind === "SENSITIVE_REFERENCE") return "MASKED_ACCOUNT";
  if (field.kind === "DATE") return DATE_TYPES[field.fieldCode] ?? "ACTION_DATE";
  if (field.kind === "MONEY") return MONEY_TYPES[field.fieldCode] ?? "OTHER";
  if (field.kind === "NORMALIZED_STATE") return "DOCUMENT_STATUS";
  return "FACT_OR_GROUND";
}

function semantic(field: AeatP0ExtractedFieldV10): FiscalNotificationVerticalSliceReviewFieldV1["semantic"] {
  if (field.kind === "REFERENCE") return "REFERENCE";
  if (field.kind === "SENSITIVE_REFERENCE") return "MASKED_VALUE";
  if (field.kind === "DATE") return "DATE";
  if (field.kind === "MONEY") return "MONEY";
  if (field.kind === "NORMALIZED_STATE") return "STATUS";
  return "DETAIL";
}

function projectField(field: AeatP0ExtractedFieldV10): FiscalNotificationVerticalSliceReviewFieldV1 {
  const structuredNormalizedValue = field.kind === "STRUCTURED_PRESENCE"
    ? `P0_V10:${field.fieldCode}`
    : field.kind === "NORMALIZED_ENUM"
      ? `P0_V10_ENUM:${field.normalizedValue}`
      : field.kind === "TIME"
        ? `P0_V10_TIME:${field.normalizedValue}`
        : field.kind === "DURATION"
          ? `P0_V10_DURATION:${field.normalizedValue}`
          : field.normalizedValue;
  return Object.freeze({
    fieldId: field.fieldId,
    semantic: semantic(field),
    canonicalType: canonicalType(field),
    label: AEAT_P0_DEEP_REVIEW_FIELD_LABELS_V10[field.fieldCode] ?? field.sourceLabel,
    displayValue: field.kind === "DATE" && field.normalizedValue
      ? field.normalizedValue.split("-").reverse().join("/")
      : field.displayValue,
    normalizedValue: field.fingerprintSha256 ? `sha256:${field.fingerprintSha256}` : structuredNormalizedValue,
    amountCents: field.amountCents,
    currency: field.currency,
    sourcePageNumbers: field.sourcePageNumbers,
    sourceLabel: field.sourceLabel,
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

export function projectAeatP0DeepReviewV10(outcome: AeatP0DeepExtractorOutcomeV10): FiscalNotificationVerticalSliceReviewV1 {
  if (outcome.status !== "REVIEW_REQUIRED" || !outcome.familyId || !outcome.title || !outcome.extractorId || outcome.matchedPageNumbers.length === 0) {
    return createEmptyFiscalNotificationVerticalSliceReviewV1(outcome.status === "BLOCKED" ? "BLOCKED" : "INFORMATION_PENDING");
  }
  const recognition: FiscalNotificationVerticalSliceReviewFieldV1 = Object.freeze({
    fieldId: "p0-v10:recognition:0",
    semantic: "DETAIL",
    canonicalType: "FACT_OR_GROUND",
    label: "Tipo de documento",
    displayValue: "Estructura oficial reconocida",
    normalizedValue: `P0_V10:${outcome.familyId}`,
    amountCents: null,
    currency: null,
    sourcePageNumbers: outcome.matchedPageNumbers,
    sourceLabel: "Título y anclas estructurales",
    confidence: 1,
    reviewStatus: "REVIEW_REQUIRED",
  });
  return parseFiscalNotificationVerticalSliceReviewV1({
    schemaVersion: 1,
    reviewVersion: "1.0.0",
    status: "REVIEW_REQUIRED",
    documents: [Object.freeze({
      reviewDocumentId: `review-document:p0-v10:${outcome.familyId}`,
      extractorId: outcome.extractorId,
      familyId: outcome.familyId,
      title: outcome.title,
      subtitle: outcome.missingRequiredFieldIds.length === 0
        ? "Datos estructurados listos para revisar"
        : "Revisa los datos detectados y completa los que falten",
      pageFrom: outcome.matchedPageNumbers[0]!,
      pageTo: outcome.matchedPageNumbers.at(-1)!,
      confidence: 1,
      fields: Object.freeze([recognition, ...outcome.fields.map(projectField)]),
      warnings: Object.freeze([
        ...outcome.issues.map((issue) => `P0_V10_${issue}`),
        ...outcome.missingRequiredFieldIds.map((fieldId) => `P0_V10_MISSING_${fieldId}`),
      ]),
      requiresHumanReview: true,
    })],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    permitsDebtCreation: false,
    permitsDeadlineCreation: false,
    permitsPaymentAction: false,
    permitsAccountingAction: false,
  });
}
