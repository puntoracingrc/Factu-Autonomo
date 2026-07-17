import {
  FiscalNotificationInputError,
  assertBoundedId,
  assertNonNegativeIntegerCents,
} from "../input-contract";
import {
  type SourceCoordinatesV1,
  assertBoundedLiteralV1,
  assertConfidenceV1,
  assertExactDataRecordV1,
  assertPageNumberV1,
  assertSourceCoordinatesV1,
  freezeCoordinatesV1,
} from "./shared.v1";

export const MONETARY_COMPONENT_TYPES_V1 = Object.freeze([
  "PRINCIPAL", "TAX_QUOTA", "PENALTY", "SURCHARGE", "EXECUTIVE_SURCHARGE",
  "ORIGINAL_TAX_PRINCIPAL", "OUTSTANDING_PRINCIPAL", "DEFERRAL_INTEREST",
  "EXECUTIVE_SURCHARGE_5", "EXECUTIVE_SURCHARGE_10", "EXECUTIVE_SURCHARGE_20",
  "LATE_INTEREST", "COSTS", "PAYMENT_ON_ACCOUNT", "TOTAL_CLAIMED", "TOTAL_PAID",
  "PARTIAL_PAYMENT", "TOTAL_PENDING", "REFUND_REQUESTED", "REFUND_RECOGNIZED",
  "REFUND_PAID", "CREDIT_APPLIED", "COMPENSATED_AMOUNT", "SEIZED_AMOUNT",
  "RELEASED_AMOUNT", "PAYMENT_OPTION_AMOUNT", "OTHER",
] as const);
export type MonetaryComponentTypeV1 = (typeof MONETARY_COMPONENT_TYPES_V1)[number];

export interface MonetaryComponentV1 {
  readonly componentId: string;
  readonly componentType: MonetaryComponentTypeV1;
  readonly amountCents: number;
  readonly currency: "EUR";
  readonly sign: "POSITIVE" | "NEGATIVE";
  readonly sourceDocumentId: string;
  readonly sourcePage: number;
  readonly sourceLabel: string | null;
  readonly sourceCoordinates: SourceCoordinatesV1 | null;
  readonly extractionConfidence: number;
  readonly explicitlyPrinted: boolean;
  readonly calculated: boolean;
  readonly calculationFormula: string | null;
  readonly relatedDebtKey: string | null;
  readonly requiresHumanReview: boolean;
}

export function createMonetaryComponentV1(input: MonetaryComponentV1): MonetaryComponentV1 {
  assertExactDataRecordV1(input, "money", [
    "componentId", "componentType", "amountCents", "currency", "sign", "sourceDocumentId",
    "sourcePage", "sourceLabel", "sourceCoordinates", "extractionConfidence", "explicitlyPrinted",
    "calculated", "calculationFormula", "relatedDebtKey", "requiresHumanReview",
  ]);
  assertBoundedId(input.componentId, "money.componentId");
  if (!MONETARY_COMPONENT_TYPES_V1.includes(input.componentType)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "money.componentType");
  }
  assertNonNegativeIntegerCents(input.amountCents, "money.amountCents");
  if (input.currency !== "EUR") throw new FiscalNotificationInputError("INVALID_INPUT", "money.currency");
  if (input.sign !== "POSITIVE" && input.sign !== "NEGATIVE") {
    throw new FiscalNotificationInputError("INVALID_INPUT", "money.sign");
  }
  assertBoundedId(input.sourceDocumentId, "money.sourceDocumentId");
  assertPageNumberV1(input.sourcePage, "money.sourcePage");
  assertBoundedLiteralV1(input.sourceLabel, "money.sourceLabel", { maxChars: 240, nullable: true });
  assertSourceCoordinatesV1(input.sourceCoordinates, "money.sourceCoordinates");
  assertConfidenceV1(input.extractionConfidence, "money.extractionConfidence");
  if (typeof input.explicitlyPrinted !== "boolean" || typeof input.calculated !== "boolean") {
    throw new FiscalNotificationInputError("INVALID_INPUT", "money.evidenceMode");
  }
  if (input.explicitlyPrinted === input.calculated) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "money.evidenceMode");
  }
  assertBoundedLiteralV1(input.calculationFormula, "money.calculationFormula", {
    maxChars: 500,
    nullable: true,
  });
  if (input.calculated !== (input.calculationFormula !== null)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "money.calculationFormula");
  }
  if (input.relatedDebtKey !== null) assertBoundedId(input.relatedDebtKey, "money.relatedDebtKey");
  if (typeof input.requiresHumanReview !== "boolean" || (input.calculated && !input.requiresHumanReview)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "money.requiresHumanReview");
  }
  return Object.freeze({ ...input, sourceCoordinates: freezeCoordinatesV1(input.sourceCoordinates) });
}
