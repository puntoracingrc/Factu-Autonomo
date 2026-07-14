import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3,
  type FiscalNotificationDocumentFamilyIdV3,
  type FiscalNotificationDocumentFamilyV3,
} from "../knowledge/document-families.v3";
import {
  type BaseExtractorIdV1,
  type FamilyExtractorBindingV1,
} from "./extractor-contract.v1";
import { FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1 } from "./shared.v1";

const ENGINE_FIELDS = Object.freeze({
  "notification-envelope": ["notificationReference", "deliveryStatus", "availabilityDate", "accessDate"],
  "informative-communication": ["subject", "communicationDate", "explicitInformation"],
  "identity-and-certificate": ["certificateType", "issueDate", "validityText"],
  "census-resolution": ["agreementType", "effectiveDate", "registryReference"],
  requirement: ["requirementNumber", "requestedItems", "rawDeadlineText", "responseChannel"],
  assessment: ["assessmentStage", "taxConcept", "fiscalYear", "taxPeriod", "allegationText"],
  penalty: ["penaltyStage", "allegedConduct", "reductionText"],
  deferral: ["deferralStage", "installments", "guaranteeText", "pendingBalance"],
  compensation: ["compensationStage", "debtReferences", "creditReferences", "compensatedAmount"],
  refund: ["refundStage", "refundReference", "recognizedAmount", "paymentStatus"],
  seizure: ["assetClass", "seizureOrderReference", "garnishedParty", "seizedAmount"],
  "payment-order": ["paymentReference", "paymentChannel", "voluntaryPaymentDeadline", "amountDue"],
  "payment-evidence": ["paymentReceiptReference", "nrc", "paymentDate", "paymentStatus", "amountPaid"],
  "appeal-and-review": ["reviewType", "challengedActReference", "suspensionText", "resolutionText"],
  liability: ["liabilityType", "primaryDebtor", "liableParty", "derivationReference"],
  inspection: ["inspectionStage", "scope", "periods", "actReference"],
} as const satisfies Readonly<Record<BaseExtractorIdV1, readonly string[]>>);

const EXECUTABLE_REVIEW_ONLY_FAMILIES = new Set<FiscalNotificationDocumentFamilyIdV3>([
  "compliance.formal_filing_requirement",
  "assessment.allegations_and_proposal",
  "assessment.final_provisional_assessment",
  "collection.enforcement_order",
  "collection.deferral_grant",
  "collection.offset_requested",
  "collection.offset_ex_officio",
  "payment.payment_form",
  "payment.receipt",
  "payment.failed_or_reversed",
]);

const RECOGNIZED_WITHOUT_COMPLETE_EXTRACTOR = new Set<FiscalNotificationDocumentFamilyIdV3>([
  "seizure.real_estate",
  "registry.tax_registration_resolution",
]);

function engineForFamily(family: FiscalNotificationDocumentFamilyV3): BaseExtractorIdV1 {
  const { id } = family;
  if (id.startsWith("notification.")) return "notification-envelope";
  if (id.startsWith("information.")) return "informative-communication";
  if (id.startsWith("identity.") || id.startsWith("certificate.")) return "identity-and-certificate";
  if (id.startsWith("registry.")) return "census-resolution";
  if (id.startsWith("compliance.")) return "requirement";
  if (id.startsWith("assessment.")) return "assessment";
  if (id.startsWith("sanction.")) return "penalty";
  if (id.startsWith("refund.") || id.startsWith("irpf.")) return "refund";
  if (id.startsWith("seizure.")) return "seizure";
  if (id.startsWith("review.")) return "appeal-and-review";
  if (id.startsWith("liability.")) return "liability";
  if (id.startsWith("inspection.")) return "inspection";
  if (id === "payment.payment_form") return "payment-order";
  if (id.startsWith("payment.")) return "payment-evidence";
  if (id.startsWith("collection.deferral_")) return "deferral";
  if (id.startsWith("collection.offset_") || id === "collection.extinction_or_balance_notice") {
    return "compensation";
  }
  if (id === "collection.precautionary_measure" || id === "collection.asset_sale") return "seizure";
  if (
    id === "collection.enforcement_order" ||
    id === "collection.interest_assessment" ||
    id === "collection.late_filing_surcharge" ||
    id === "collection.external_debt"
  ) return "payment-order";
  throw new Error("FISCAL_NOTIFICATION_UNMAPPED_FAMILY");
}
function subtypeForFamilyId(id: FiscalNotificationDocumentFamilyIdV3): string {
  return id.split(".").slice(1).join("_").toUpperCase();
}

function bindingForFamily(family: FiscalNotificationDocumentFamilyV3): FamilyExtractorBindingV1 {
  const extractorId = engineForFamily(family);
  return Object.freeze({
    familyId: family.id,
    extractorId,
    extractorVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    subtype: subtypeForFamilyId(family.id),
    variant: "AEAT_COMMON_TERRITORY_CATALOG_V3",
    additionalFieldIds: Object.freeze([...ENGINE_FIELDS[extractorId]]),
    classificationRuleIds: Object.freeze([
      `classification.${extractorId}.explicit-markers.v1`,
      "classification.segment-main-act-only.v1",
    ]),
    presentationViewId: `fiscal-notification.${extractorId}.review-card.v1`,
    implementationStatus: EXECUTABLE_REVIEW_ONLY_FAMILIES.has(family.id)
      ? "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY"
      : RECOGNIZED_WITHOUT_COMPLETE_EXTRACTOR.has(family.id)
        ? "ADAPTER_REQUIRED"
        : "CONTRACT_ONLY",
  });
}

export const FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1 = Object.freeze(
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3.map(bindingForFamily),
) satisfies readonly FamilyExtractorBindingV1[];

const bindingByFamilyId = new Map(
  FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.map((binding) => [binding.familyId, binding] as const),
);

export function resolveFamilyExtractorBindingV1(
  familyId: FiscalNotificationDocumentFamilyIdV3,
): FamilyExtractorBindingV1 | null {
  return bindingByFamilyId.get(familyId) ?? null;
}
