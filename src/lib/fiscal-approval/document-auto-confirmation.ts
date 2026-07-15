import type { FiscalFeatureFlags } from "./contracts";

export const DOCUMENT_AUTO_CONFIRMATION_BLOCKING_REASONS = [
  "DOCUMENT_AUTO_CONFIRMATION_FLAG_DISABLED",
  "LAYOUT_NOT_VALIDATED",
  "FISCAL_YEAR_NOT_COMPATIBLE",
  "FIELD_NOT_EXPLICIT",
  "CONFIDENCE_INSUFFICIENT",
  "DOCUMENT_INCOMPLETE",
  "DOCUMENT_CONTRADICTION",
  "TRUST_POLICY_NOT_APPROVED",
] as const;

export type DocumentAutoConfirmationBlockingReason =
  (typeof DOCUMENT_AUTO_CONFIRMATION_BLOCKING_REASONS)[number];

export interface DocumentAutoConfirmationInput {
  flags: FiscalFeatureFlags;
  layoutValidated: boolean;
  fiscalYearCompatible: boolean;
  explicitField: boolean;
  confidence: number;
  minimumConfidence: number;
  documentComplete: boolean;
  hasContradiction: boolean;
  trustPolicyApproved: boolean;
}

export function authorizeDocumentAutoConfirmation(
  input: DocumentAutoConfirmationInput,
): {
  authorized: boolean;
  blockingReasons: readonly DocumentAutoConfirmationBlockingReason[];
} {
  const reasons: DocumentAutoConfirmationBlockingReason[] = [];
  if (!input.flags.document_auto_confirmation) {
    reasons.push("DOCUMENT_AUTO_CONFIRMATION_FLAG_DISABLED");
  }
  if (!input.layoutValidated) reasons.push("LAYOUT_NOT_VALIDATED");
  if (!input.fiscalYearCompatible) {
    reasons.push("FISCAL_YEAR_NOT_COMPATIBLE");
  }
  if (!input.explicitField) reasons.push("FIELD_NOT_EXPLICIT");
  if (
    !Number.isFinite(input.confidence) ||
    !Number.isFinite(input.minimumConfidence) ||
    input.confidence < input.minimumConfidence
  ) {
    reasons.push("CONFIDENCE_INSUFFICIENT");
  }
  if (!input.documentComplete) reasons.push("DOCUMENT_INCOMPLETE");
  if (input.hasContradiction) reasons.push("DOCUMENT_CONTRADICTION");
  if (!input.trustPolicyApproved) reasons.push("TRUST_POLICY_NOT_APPROVED");
  return Object.freeze({
    authorized: reasons.length === 0,
    blockingReasons: Object.freeze(reasons),
  });
}
