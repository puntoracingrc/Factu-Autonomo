import {
  FiscalNotificationInputError,
  assertBoundedOwnerScope,
} from "../input-contract";
import {
  createRelationshipV1,
  type AdministrativeActV1,
  type AdministrativeEntityV1,
  type DebtClaimV1,
  type PaymentEventV1,
  type RelationTypeV1,
  type RelationshipV1,
} from "./domain.v1";
import type { PaymentEvidenceExtractorOutputV1, PaymentEvidenceStateV1 } from "./payment-evidence-extractor.v1";
import type { PaymentOrderExtractorOutputV1 } from "./payment-order-extractor.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const PAYMENT_RELATION_ENGINE_VERSION_V1 = "1.0.0" as const;

export type PaymentRelationMatchKeyV1 =
  | "DEBT_KEY"
  | "LIQUIDATION_KEY"
  | "PAYMENT_REFERENCE";

export type PaymentRelationCorroborationKeyV1 =
  | "NIF"
  | "MODEL"
  | "FISCAL_YEAR"
  | "TAX_PERIOD"
  | "AMOUNT";

export type PaymentRelationContradictionV1 =
  | "DEBT_KEY_MISMATCH"
  | "LIQUIDATION_KEY_MISMATCH"
  | "NIF_MISMATCH"
  | "MODEL_MISMATCH"
  | "FISCAL_YEAR_MISMATCH"
  | "TAX_PERIOD_MISMATCH"
  | "TOTAL_PAYMENT_AMOUNT_MISMATCH"
  | "PARTIAL_PAYMENT_EXCEEDS_ORDER_TOTAL"
  | "NON_POSITIVE_PAYMENT_AMOUNT";

export interface LinkPaymentOrderEvidenceInputV1 {
  readonly ownerScope: string;
  readonly order: PaymentOrderExtractorOutputV1;
  readonly evidence: PaymentEvidenceExtractorOutputV1;
  readonly createdAt: string;
}

export type LinkPaymentOrderEvidenceResultV1 = Readonly<{
  contractVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  engineVersion: typeof PAYMENT_RELATION_ENGINE_VERSION_V1;
  status:
    | "LINKED_REVIEW_REQUIRED"
    | "INFORMATION_PENDING"
    | "CONFLICTING_REVIEW_REQUIRED";
  reason:
    | "EXPLICIT_REFERENCE_LINK"
    | "NO_SHARED_EXPLICIT_REFERENCE"
    | "EXTRACTOR_OUTPUT_NOT_RECOGNIZED"
    | "EXPLICIT_REFERENCE_OR_FACT_CONFLICT";
  ownerScope: string;
  matchedKeys: readonly PaymentRelationMatchKeyV1[];
  corroboratingKeys: readonly PaymentRelationCorroborationKeyV1[];
  contradictions: readonly PaymentRelationContradictionV1[];
  relationships: readonly RelationshipV1[];
  warnings: readonly (
    | "PAYMENT_STATE_UNKNOWN_NO_SETTLEMENT_RELATION"
    | "PAYMENT_RELATION_TARGET_DEBT_NOT_AVAILABLE"
    | "CANCELLED_PAYMENT_HAS_NO_SAFE_SETTLEMENT_RELATION"
  )[];
  createdAt: string;
  requiresHumanReview: true;
  materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  automaticEffect: "NONE";
  retainedSourceContent: "NONE";
}>;

interface ComparedFactsV1 {
  readonly matchedKeys: readonly PaymentRelationMatchKeyV1[];
  readonly corroboratingKeys: readonly PaymentRelationCorroborationKeyV1[];
  readonly contradictions: readonly PaymentRelationContradictionV1[];
}

export function linkPaymentOrderToEvidenceV1(
  input: LinkPaymentOrderEvidenceInputV1,
): LinkPaymentOrderEvidenceResultV1 {
  assertExactDataRecordV1(input, "paymentRelationInput", ["ownerScope", "order", "evidence", "createdAt"]);
  assertBoundedOwnerScope(input.ownerScope, "paymentRelationInput.ownerScope");
  const createdAt = assertIsoTimestamp(input.createdAt);
  assertExtractorOutput(input.order, "payment-order", input.ownerScope, "paymentRelationInput.order");
  assertExtractorOutput(input.evidence, "payment-evidence", input.ownerScope, "paymentRelationInput.evidence");
  if (
    input.order.status !== "REVIEW_REQUIRED" ||
    input.evidence.status !== "REVIEW_REQUIRED" ||
    input.order.paymentOrderFacts.documentKind === null ||
    input.evidence.paymentEvidenceFacts.documentKind === null
  ) {
    return result({
      status: "INFORMATION_PENDING",
      reason: "EXTRACTOR_OUTPUT_NOT_RECOGNIZED",
      ownerScope: input.ownerScope,
      createdAt,
    });
  }

  const orderAct = uniqueEntity<AdministrativeActV1>(input.order.entities, "ADMINISTRATIVE_ACT", "paymentRelation.orderAct");
  const evidenceAct = uniqueEntity<AdministrativeActV1>(input.evidence.entities, "ADMINISTRATIVE_ACT", "paymentRelation.evidenceAct");
  if (!orderAct || !evidenceAct) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "paymentRelation.entities.administrativeAct");
  }
  const compared = compareExplicitFacts(input.order, input.evidence);
  if (compared.contradictions.length > 0) {
    return result({
      status: "CONFLICTING_REVIEW_REQUIRED",
      reason: "EXPLICIT_REFERENCE_OR_FACT_CONFLICT",
      ownerScope: input.ownerScope,
      createdAt,
      matchedKeys: compared.matchedKeys,
      corroboratingKeys: compared.corroboratingKeys,
      contradictions: compared.contradictions,
      relationships: [createConflictRelationship(evidenceAct, orderAct, compared)],
    });
  }
  if (compared.matchedKeys.length === 0) {
    return result({
      status: "INFORMATION_PENDING",
      reason: "NO_SHARED_EXPLICIT_REFERENCE",
      ownerScope: input.ownerScope,
      createdAt,
      corroboratingKeys: compared.corroboratingKeys,
    });
  }

  const matchingEvidence = relationEvidenceIds(evidenceAct, orderAct, compared.matchedKeys);
  const relationships: RelationshipV1[] = [createRelationshipV1({
    relationshipId: relationshipId(evidenceAct.entityId, orderAct.entityId, "REFERENCES"),
    sourceEntityId: evidenceAct.entityId,
    targetEntityId: orderAct.entityId,
    relationType: "REFERENCES",
    confidenceLevel: "EXPLICIT_REFERENCE",
    matchingEvidence,
    contradictoryEvidence: Object.freeze([]),
    ruleId: "payment-relation.explicit-reference.v1",
    createdAutomatically: true,
    userConfirmed: false,
    explanation: "El justificante y la orden comparten al menos una referencia literal exacta; la relación queda pendiente de revisión.",
  })];
  const warnings: LinkPaymentOrderEvidenceResultV1["warnings"][number][] = [];
  const evidencePayment = uniqueEntity<PaymentEventV1>(input.evidence.entities, "PAYMENT_EVENT", "paymentRelation.evidencePayment");
  const orderPayment = uniqueEntity<PaymentEventV1>(input.order.entities, "PAYMENT_EVENT", "paymentRelation.orderPayment");
  const orderDebt = uniqueEntity<DebtClaimV1>(input.order.entities, "DEBT_CLAIM", "paymentRelation.orderDebt");
  const state = input.evidence.paymentEvidenceFacts.paymentState;

  if (state === "UNKNOWN") {
    warnings.push("PAYMENT_STATE_UNKNOWN_NO_SETTLEMENT_RELATION");
  } else if (state === "CANCELLED") {
    warnings.push("CANCELLED_PAYMENT_HAS_NO_SAFE_SETTLEMENT_RELATION");
  } else if (evidencePayment) {
    const operational = operationalRelation(state, orderDebt, orderPayment);
    if (operational) {
      relationships.push(createRelationshipV1({
        relationshipId: relationshipId(evidencePayment.entityId, operational.target.entityId, operational.type),
        sourceEntityId: evidencePayment.entityId,
        targetEntityId: operational.target.entityId,
        relationType: operational.type,
        confidenceLevel: "EXPLICIT_REFERENCE",
        matchingEvidence,
        contradictoryEvidence: Object.freeze([]),
        ruleId: `payment-relation.${operational.type.toLowerCase().replaceAll("_", "-")}.v1`,
        createdAutomatically: true,
        userConfirmed: false,
        explanation: operational.explanation,
      }));
    } else if (state === "CONFIRMED" || state === "PARTIAL") {
      warnings.push("PAYMENT_RELATION_TARGET_DEBT_NOT_AVAILABLE");
    }
  }

  return result({
    status: "LINKED_REVIEW_REQUIRED",
    reason: "EXPLICIT_REFERENCE_LINK",
    ownerScope: input.ownerScope,
    createdAt,
    matchedKeys: compared.matchedKeys,
    corroboratingKeys: compared.corroboratingKeys,
    relationships,
    warnings,
  });
}

function compareExplicitFacts(
  order: PaymentOrderExtractorOutputV1,
  evidence: PaymentEvidenceExtractorOutputV1,
): ComparedFactsV1 {
  const matchedKeys: PaymentRelationMatchKeyV1[] = [];
  const corroboratingKeys: PaymentRelationCorroborationKeyV1[] = [];
  const contradictions: PaymentRelationContradictionV1[] = [];
  comparePair(order.paymentOrderFacts.debtKey?.printedValue, evidence.paymentEvidenceFacts.debtKey?.printedValue,
    "DEBT_KEY", "DEBT_KEY_MISMATCH", matchedKeys, contradictions);
  comparePair(order.paymentOrderFacts.liquidationKey?.printedValue, evidence.paymentEvidenceFacts.liquidationKey?.printedValue,
    "LIQUIDATION_KEY", "LIQUIDATION_KEY_MISMATCH", matchedKeys, contradictions);
  comparePair(order.paymentOrderFacts.paymentReference?.printedValue, evidence.paymentEvidenceFacts.receiptNumber?.printedValue,
    "PAYMENT_REFERENCE", null, matchedKeys, contradictions);

  compareCorroboration(order.paymentOrderFacts.taxId?.printedValue, evidence.paymentEvidenceFacts.taxId?.printedValue,
    "NIF", "NIF_MISMATCH", corroboratingKeys, contradictions);
  compareCorroboration(order.paymentOrderFacts.model?.printedValue, evidence.paymentEvidenceFacts.model?.printedValue,
    "MODEL", "MODEL_MISMATCH", corroboratingKeys, contradictions);
  compareCorroboration(order.paymentOrderFacts.fiscalYear?.printedValue, evidence.paymentEvidenceFacts.fiscalYear?.printedValue,
    "FISCAL_YEAR", "FISCAL_YEAR_MISMATCH", corroboratingKeys, contradictions);
  compareCorroboration(order.paymentOrderFacts.period?.printedValue, evidence.paymentEvidenceFacts.period?.printedValue,
    "TAX_PERIOD", "TAX_PERIOD_MISMATCH", corroboratingKeys, contradictions);

  const orderTotal = order.paymentOrderFacts.moneyFacts.find((item) => item.role === "TOTAL_DUE");
  const paid = evidence.paymentEvidenceFacts.amountPaid;
  const state = evidence.paymentEvidenceFacts.paymentState;
  if (paid && ["CONFIRMED", "PARTIAL"].includes(state) && (paid.sign !== "POSITIVE" || paid.amountCents === 0)) {
    contradictions.push("NON_POSITIVE_PAYMENT_AMOUNT");
  } else if (orderTotal && paid && orderTotal.sign === "POSITIVE") {
    if (state === "CONFIRMED" && paid.amountCents !== orderTotal.amountCents) {
      contradictions.push("TOTAL_PAYMENT_AMOUNT_MISMATCH");
    } else if (state === "PARTIAL" && paid.amountCents > orderTotal.amountCents) {
      contradictions.push("PARTIAL_PAYMENT_EXCEEDS_ORDER_TOTAL");
    } else if (paid.amountCents === orderTotal.amountCents || state === "PARTIAL") {
      corroboratingKeys.push("AMOUNT");
    }
  }
  return Object.freeze({
    matchedKeys: freezeSorted(matchedKeys),
    corroboratingKeys: freezeSorted(corroboratingKeys),
    contradictions: freezeSorted(contradictions),
  });
}

function comparePair(
  left: string | undefined,
  right: string | undefined,
  match: PaymentRelationMatchKeyV1,
  mismatch: PaymentRelationContradictionV1 | null,
  matches: PaymentRelationMatchKeyV1[],
  contradictions: PaymentRelationContradictionV1[],
): void {
  if (left === undefined || right === undefined) return;
  if (canonicalExplicitValue(left) === canonicalExplicitValue(right)) matches.push(match);
  else if (mismatch) contradictions.push(mismatch);
}

function compareCorroboration(
  left: string | undefined,
  right: string | undefined,
  match: PaymentRelationCorroborationKeyV1,
  mismatch: PaymentRelationContradictionV1,
  matches: PaymentRelationCorroborationKeyV1[],
  contradictions: PaymentRelationContradictionV1[],
): void {
  if (left === undefined || right === undefined) return;
  if (canonicalExplicitValue(left) === canonicalExplicitValue(right)) matches.push(match);
  else contradictions.push(mismatch);
}

function canonicalExplicitValue(value: string): string {
  if (value.length === 0 || value.length > 1_000 || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "paymentRelation.explicitValue");
  }
  return value.normalize("NFKC").replace(/\s+/gu, "").toUpperCase();
}

function operationalRelation(
  state: PaymentEvidenceStateV1,
  debt: DebtClaimV1 | null,
  orderPayment: PaymentEventV1 | null,
): Readonly<{ target: DebtClaimV1 | PaymentEventV1; type: RelationTypeV1; explanation: string }> | null {
  if (state === "CONFIRMED" && debt) {
    return Object.freeze({ target: debt, type: "PAYS", explanation: "El justificante declara un pago confirmado vinculado por referencia exacta a la deuda impresa." });
  }
  if (state === "PARTIAL" && debt) {
    return Object.freeze({ target: debt, type: "PARTIALLY_PAYS", explanation: "El justificante declara un pago parcial vinculado por referencia exacta a la deuda impresa." });
  }
  if (state === "ATTEMPTED" && orderPayment) {
    return Object.freeze({ target: orderPayment, type: "PAYMENT_ATTEMPT_FOR", explanation: "El documento declara un intento de pago para la orden vinculada por referencia exacta." });
  }
  if (state === "REJECTED" && orderPayment) {
    return Object.freeze({ target: orderPayment, type: "PAYMENT_REJECTED_FOR", explanation: "El documento declara un pago rechazado para la orden vinculada por referencia exacta." });
  }
  if (state === "RETURNED" && orderPayment) {
    return Object.freeze({ target: orderPayment, type: "PAYMENT_RETURNED_FOR", explanation: "El documento declara un pago devuelto para la orden vinculada por referencia exacta." });
  }
  return null;
}

function createConflictRelationship(
  source: AdministrativeActV1,
  target: AdministrativeActV1,
  compared: ComparedFactsV1,
): RelationshipV1 {
  return createRelationshipV1({
    relationshipId: relationshipId(source.entityId, target.entityId, "REFERENCES"),
    sourceEntityId: source.entityId,
    targetEntityId: target.entityId,
    relationType: "REFERENCES",
    confidenceLevel: "CONFLICTING",
    matchingEvidence: relationEvidenceIds(source, target, compared.matchedKeys),
    contradictoryEvidence: Object.freeze(compared.contradictions.map((item) => `contradiction:${item.toLowerCase()}`)),
    ruleId: "payment-relation.explicit-conflict.v1",
    createdAutomatically: false,
    userConfirmed: false,
    explanation: "Las referencias o los hechos impresos contienen una contradicción; no se aplica ningún efecto y se exige revisión.",
  });
}

function relationEvidenceIds(
  source: AdministrativeActV1,
  target: AdministrativeActV1,
  matchedKeys: readonly PaymentRelationMatchKeyV1[],
): readonly string[] {
  return Object.freeze([...new Set([
    ...source.evidence.sourceSegmentIds,
    ...target.evidence.sourceSegmentIds,
    ...matchedKeys.map((item) => `match:${item.toLowerCase()}`),
  ])]);
}

function uniqueEntity<T extends AdministrativeEntityV1>(
  entities: readonly AdministrativeEntityV1[],
  kind: T["entityKind"],
  path: string,
): T | null {
  const matches = entities.filter((item) => item.entityKind === kind);
  if (matches.length > 1) throw new FiscalNotificationInputError("INVALID_INPUT", path);
  return (matches[0] as T | undefined) ?? null;
}

function assertExtractorOutput(
  output: PaymentOrderExtractorOutputV1 | PaymentEvidenceExtractorOutputV1,
  extractorId: "payment-order" | "payment-evidence",
  ownerScope: string,
  path: string,
): void {
  if (
    !Object.isFrozen(output) ||
    output.extractorId !== extractorId ||
    output.contractVersion !== FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1 ||
    output.extractorVersion !== FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1 ||
    output.requiresHumanReview !== true ||
    output.materializationPolicy !== "PROHIBITED_UNTIL_HUMAN_REVIEW" ||
    output.permitsDebtCreation !== false ||
    output.permitsDeadlineCreation !== false ||
    output.permitsPaymentAction !== false ||
    output.permitsAccountingAction !== false ||
    output.permitsAutomaticFamilyConfirmation !== false ||
    !Object.isFrozen(output.entities) ||
    output.entities.some((entity) => entity.ownerScope !== ownerScope)
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

function result(input: Readonly<{
  status: LinkPaymentOrderEvidenceResultV1["status"];
  reason: LinkPaymentOrderEvidenceResultV1["reason"];
  ownerScope: string;
  createdAt: string;
  matchedKeys?: readonly PaymentRelationMatchKeyV1[];
  corroboratingKeys?: readonly PaymentRelationCorroborationKeyV1[];
  contradictions?: readonly PaymentRelationContradictionV1[];
  relationships?: readonly RelationshipV1[];
  warnings?: LinkPaymentOrderEvidenceResultV1["warnings"];
}>): LinkPaymentOrderEvidenceResultV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    engineVersion: PAYMENT_RELATION_ENGINE_VERSION_V1,
    status: input.status,
    reason: input.reason,
    ownerScope: input.ownerScope,
    matchedKeys: freezeSorted(input.matchedKeys ?? []),
    corroboratingKeys: freezeSorted(input.corroboratingKeys ?? []),
    contradictions: freezeSorted(input.contradictions ?? []),
    relationships: Object.freeze([...(input.relationships ?? [])]),
    warnings: Object.freeze([...(input.warnings ?? [])]),
    createdAt: input.createdAt,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    automaticEffect: "NONE",
    retainedSourceContent: "NONE",
  });
}

function freezeSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort());
}

function assertIsoTimestamp(value: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== (value.length === 20 ? value.replace("Z", ".000Z") : value)
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "paymentRelationInput.createdAt");
  }
  return value;
}

function relationshipId(sourceId: string, targetId: string, type: RelationTypeV1): string {
  return `fx-payment-relation-${stableHash(`${sourceId}|${targetId}|${type}`)}`;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export const PAYMENT_RELATION_ENGINE_RELEASE_V1 = Object.freeze({
  version: PAYMENT_RELATION_ENGINE_VERSION_V1,
  strongMatchKeys: Object.freeze(["DEBT_KEY", "LIQUIDATION_KEY", "PAYMENT_REFERENCE"] as const),
  corroborationOnlyKeys: Object.freeze(["NIF", "MODEL", "FISCAL_YEAR", "TAX_PERIOD", "AMOUNT"] as const),
  relationPolicy: "EXACT_EXPLICIT_REFERENCE_REQUIRED",
  conflictPolicy: "ANY_EXPLICIT_CONTRADICTION_BLOCKS_SETTLEMENT_RELATION",
  paymentPolicy: "DOCUMENT_STATE_CONTROLS_RELATION_TYPE_NO_AUTOMATIC_EFFECT",
  absencePolicy: "ABSENCE_OF_PAYMENT_EVIDENCE_NEVER_MEANS_NONPAYMENT",
  actionPolicy: "REVIEW_ONLY_NO_DEBT_PAYMENT_DEADLINE_OR_ACCOUNTING_ACTION",
});
