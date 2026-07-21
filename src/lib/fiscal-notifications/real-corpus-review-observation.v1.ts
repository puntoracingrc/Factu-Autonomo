import { sha256Hex } from "../document-integrity/snapshot-hash";
import type { FiscalNotificationVerticalSliceReviewFieldV1 } from "./vertical-slice-review.v1";

type CanonicalType =
  FiscalNotificationVerticalSliceReviewFieldV1["canonicalType"];

const SENSITIVE_REFERENCE_TYPES = new Set<CanonicalType>([
  "BANK_REFERENCE",
  "CSV",
  "NRC",
  "VEHICLE_OR_FINE_REFERENCE",
]);

export function serializableRealCorpusReference(
  canonicalType: CanonicalType,
  value: string,
): Readonly<{ displayValue: string; normalizedValue: string }> {
  if (!SENSITIVE_REFERENCE_TYPES.has(canonicalType)) {
    return Object.freeze({ displayValue: value, normalizedValue: value });
  }
  const fingerprint = sha256Hex(
    `factu:fiscal-notification:real-corpus-reference:v1:${canonicalType}:${value}`,
  );
  return Object.freeze({
    displayValue: `Huella protegida ${fingerprint.slice(0, 12)}…`,
    normalizedValue: fingerprint,
  });
}

export function canonicalRealCorpusReferenceType(
  fieldCode: string,
): CanonicalType {
  if (fieldCode === "PAYMENT_FORM_MODEL") return "PAYMENT_FORM_MODEL";
  if (/PAYMENT_FORM_REFERENCE|PAYMENT_REFERENCE/u.test(fieldCode)) {
    return "PAYMENT_FORM_REFERENCE";
  }
  if (fieldCode === "NRC") return "NRC";
  if (/SEIZURE_ORDER_ID/u.test(fieldCode)) return "SEIZURE_ORDER_ID";
  if (/LIQUIDATION_KEY/u.test(fieldCode)) return "LIQUIDATION_KEY";
  if (/DEBT_KEY|EXTERNAL_DEBT_REFERENCE/u.test(fieldCode)) return "DEBT_KEY";
  if (/SANCTION_REFERENCE/u.test(fieldCode)) return "EXPEDIENTE_ID";
  if (/PROCEDURE/u.test(fieldCode)) return "PROCEDURE_ID";
  if (/EXPEDIENTE|CASE_ID|FILE_ID/u.test(fieldCode)) return "EXPEDIENTE_ID";
  if (/NOTIFICATION_ID/u.test(fieldCode)) return "NOTIFICATION_ID";
  if (/REFUND_REFERENCE/u.test(fieldCode)) return "REFUND_REFERENCE";
  if (/CERTIFICATE_OR_COMMUNICATION_ID/u.test(fieldCode)) {
    return "NOTIFICATION_ID";
  }
  if (/UNDERLYING_ACT_REFERENCE/u.test(fieldCode)) return "ACT_ID";
  if (
    /AGREEMENT_ID|REPLACES_AGREEMENT_ID|OFFSET_REFERENCE|RESOLUTION_REFERENCE|REFUND_DECISION_REFERENCE/u.test(
      fieldCode,
    )
  ) {
    return "AGREEMENT_ID";
  }
  if (/FINAL_ASSESSMENT_REFERENCE|ACT_ID|DOCUMENT_REFERENCE/u.test(fieldCode)) {
    return "ACT_ID";
  }
  if (/REGISTRY_ID/u.test(fieldCode)) return "REGISTRY_ID";
  if (/FILING_RECEIPT/u.test(fieldCode)) return "FILING_RECEIPT_ID";
  if (/PAYMENT_RECEIPT/u.test(fieldCode)) return "PAYMENT_RECEIPT_ID";
  if (
    /TAX_MODEL|RELATED_MODEL|REQUEST_MODEL|SOURCE_MODEL|EXPECTED_MODEL/u.test(
      fieldCode,
    )
  ) {
    return "MODEL";
  }
  if (/FISCAL_YEAR/u.test(fieldCode)) return "FISCAL_YEAR";
  if (/TAX_PERIOD/u.test(fieldCode)) return "TAX_PERIOD";
  return "OTHER_OFFICIAL_REFERENCE";
}

export function canonicalRealCorpusDateType(
  fieldCode: string,
): CanonicalType | null {
  switch (fieldCode) {
    case "DOCUMENT_DATE":
    case "ISSUE_DATE":
      return "ISSUE_DATE";
    case "SIGNATURE_DATE":
    case "SIGNING_DATE":
      return "SIGNING_DATE";
    case "EFFECTIVE_NOTIFICATION_DATE":
      return "EFFECTIVE_NOTIFICATION_DATE";
    case "ACTION_DATE":
    case "EFFECTIVE_DATE":
    case "PUBLICATION_DATE":
    case "REGISTRATION_DATE":
      return "ACTION_DATE";
    case "SEIZURE_DATE":
      return "SEIZURE_DATE";
    case "RELEASE_DATE":
      return "RELEASE_DATE";
    case "PAYMENT_FORM_DATE":
      return "PAYMENT_FORM_DATE";
    case "PAYMENT_DATE":
      return "PAYMENT_DATE";
    case "INTEREST_CALCULATION_START":
      return "INTEREST_START_DATE";
    case "INTEREST_CALCULATION_END":
      return "INTEREST_END_DATE";
    case "VOLUNTARY_END_DATE":
    case "VOLUNTARY_PAYMENT_DEADLINE":
      return "VOLUNTARY_PAYMENT_DEADLINE";
    case "RESPONSE_DEADLINE":
      return "RESPONSE_DEADLINE";
    default:
      return null;
  }
}

export function canonicalRealCorpusMoneyType(
  fieldCode: string,
): CanonicalType {
  if (/PLAN_INTEREST|DEFERRAL_INTEREST/u.test(fieldCode)) {
    return "DEFERRAL_INTEREST";
  }
  if (/^OUTSTANDING_PRINCIPAL$/u.test(fieldCode)) {
    return "OUTSTANDING_PRINCIPAL";
  }
  if (/ORDINARY_SURCHARGE_20/u.test(fieldCode)) {
    return "EXECUTIVE_SURCHARGE_20";
  }
  if (/CONDITIONAL_EXECUTIVE_5_SURCHARGE/u.test(fieldCode)) {
    return "EXECUTIVE_SURCHARGE_5";
  }
  if (/^SEIZURE_DEBT_AMOUNT_\d+$/u.test(fieldCode)) {
    return "OUTSTANDING_PRINCIPAL";
  }
  if (
    /(?:OUTSTANDING|PENDING|SOURCE|PLAN|EXTERNAL|ORIGINAL_TAX)_PRINCIPAL|^PRINCIPAL$/u.test(
      fieldCode,
    )
  ) {
    return "PRINCIPAL";
  }
  if (
    /DOCUMENT_TOTAL|PLAN_TOTAL|ORDINARY_TOTAL|TOTAL_WITH|DEBT_TOTAL|DEBT_SUBTOTAL|ASSESSMENT_TOTAL|TOTAL_BEFORE|TOTAL_CLAIMED/u.test(
      fieldCode,
    )
  ) {
    return "TOTAL_CLAIMED";
  }
  if (/SURCHARGE|RECARGO/u.test(fieldCode)) return "EXECUTIVE_SURCHARGE";
  if (/SEIZED_AMOUNT|EMBARGAD/u.test(fieldCode)) return "SEIZED_AMOUNT";
  if (/SEIZURE_LIMIT|SEIZE_LIMIT/u.test(fieldCode)) return "SEIZURE_LIMIT";
  if (/RELEASED_AMOUNT/u.test(fieldCode)) return "RELEASED_AMOUNT";
  if (/REMITTED_AMOUNT|TRANSFERRED/u.test(fieldCode)) {
    return "OTHER";
  }
  if (/PAYMENT_ON_ACCOUNT/u.test(fieldCode)) return "PAYMENT_ON_ACCOUNT";
  if (/OFFSET_APPLIED|COMPENSATED|CREDIT_APPLIED/u.test(fieldCode)) {
    return "COMPENSATED_AMOUNT";
  }
  if (/REMAINING|RESIDUAL|TOTAL_PENDING/u.test(fieldCode)) {
    return "TOTAL_PENDING";
  }
  if (/REFUND.*(?:CREDIT|RECOGNIZED)|CREDIT_TOTAL/u.test(fieldCode)) {
    return "REFUND_RECOGNIZED";
  }
  if (/REFUND.*(?:PAID|PAYMENT)|NET_REFUND/u.test(fieldCode)) {
    return "REFUND_PAID";
  }
  if (/INTEREST/u.test(fieldCode)) return "LATE_INTEREST";
  if (/COST/u.test(fieldCode)) return "COSTS";
  if (/FINE|PENALTY|SANCTION/u.test(fieldCode)) return "PENALTY";
  if (/QUOTA/u.test(fieldCode)) return "TAX_QUOTA";
  if (/PAYMENT_FORM|PAYMENT_OPTION/u.test(fieldCode)) {
    return "PAYMENT_OPTION_AMOUNT";
  }
  return "OTHER";
}
