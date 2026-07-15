import {
  FiscalNotificationInputError,
  assertBoundedOwnerScope,
} from "../input-contract";
import type {
  AdministrativeActV1,
  AdministrativeEntityV1,
  AssetConstraintV1,
  DebtClaimV1,
  PaymentEventV1,
  RelationTypeV1,
  RelationshipV1,
} from "./domain.v1";
import { createRelationshipV1 } from "./domain.v1";
import type { ExtractorOutputV1 } from "./extractor-contract.v1";
import type { ReferenceTypeV1, ReferenceV1 } from "./reference.v1";
import type { SeizureExtractorOutputV1 } from "./seizure-extractor.v1";
import {
  FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
  assertExactDataRecordV1,
} from "./shared.v1";

export const ENFORCEMENT_SEIZURE_RELATION_ENGINE_VERSION_V1 = "1.0.0" as const;

export type EnforcementSeizureMatchKeyV1 =
  | "DEBT_KEY"
  | "LIQUIDATION_KEY"
  | "ENFORCEMENT_ACT_REFERENCE"
  | "SEIZURE_ORDER_ID";

export type EnforcementSeizureContradictionV1 =
  | "DEBT_KEY_MISMATCH"
  | "LIQUIDATION_KEY_MISMATCH"
  | "ENFORCEMENT_ACT_REFERENCE_MISMATCH"
  | "SEIZURE_ORDER_ID_MISMATCH";

type RelationEngineStatusV1 =
  | "LINKED_REVIEW_REQUIRED"
  | "INFORMATION_PENDING"
  | "CONFLICTING_REVIEW_REQUIRED";

type RelationEngineReasonV1 =
  | "EXPLICIT_ENFORCEMENT_REFERENCE_LINK"
  | "EXPLICIT_SEIZURE_ORDER_LINK"
  | "NO_SHARED_EXPLICIT_REFERENCE"
  | "EXPLICIT_REFERENCE_CONFLICT"
  | "EXTRACTOR_OUTPUT_NOT_RECOGNIZED"
  | "UNSUPPORTED_SEIZURE_FOLLOW_UP";

export interface EnforcementSeizureRelationResultV1 {
  readonly contractVersion: typeof FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1;
  readonly engineVersion: typeof ENFORCEMENT_SEIZURE_RELATION_ENGINE_VERSION_V1;
  readonly status: RelationEngineStatusV1;
  readonly reason: RelationEngineReasonV1;
  readonly ownerScope: string;
  readonly matchedKeys: readonly EnforcementSeizureMatchKeyV1[];
  readonly contradictions: readonly EnforcementSeizureContradictionV1[];
  readonly relationships: readonly RelationshipV1[];
  readonly createdAt: string;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
  readonly balanceMutationPolicy: "NO_BALANCE_OR_CURRENT_STATE_MUTATION";
  readonly automaticEffect: "NONE";
  readonly retainedSourceContent: "NONE";
}

export interface LinkEnforcementToSeizureInputV1 {
  readonly ownerScope: string;
  readonly enforcement: ExtractorOutputV1;
  readonly seizure: SeizureExtractorOutputV1;
  readonly createdAt: string;
}

export interface LinkSeizureFollowUpInputV1 {
  readonly ownerScope: string;
  readonly seizure: SeizureExtractorOutputV1;
  readonly followUp: SeizureExtractorOutputV1;
  readonly createdAt: string;
}

/**
 * Relates an enforcement order to a later seizure only through an explicit
 * administrative identifier. Equal amounts or dates never establish a link.
 */
export function linkEnforcementToSeizureV1(
  input: LinkEnforcementToSeizureInputV1,
): EnforcementSeizureRelationResultV1 {
  assertExactDataRecordV1(input, "enforcementSeizureRelationInput", [
    "ownerScope",
    "enforcement",
    "seizure",
    "createdAt",
  ]);
  const ownerScope = validateOwnerAndTimestamp(input.ownerScope, input.createdAt);
  assertCoreOutput(
    input.enforcement,
    ownerScope,
    "payment-order",
    "enforcementSeizureRelationInput.enforcement",
  );
  assertSeizureOutput(input.seizure, ownerScope, "enforcementSeizureRelationInput.seizure");
  if (
    input.enforcement.status !== "REVIEW_REQUIRED" ||
    input.seizure.status !== "REVIEW_REQUIRED" ||
    input.enforcement.familyCandidates[0]?.familyId !== "collection.enforcement_order" ||
    input.seizure.seizureFacts.documentKind !== "SEIZURE_ORDER"
  ) {
    return result(ownerScope, input.createdAt, {
      status: "INFORMATION_PENDING",
      reason: "EXTRACTOR_OUTPUT_NOT_RECOGNIZED",
    });
  }

  const compared = compareEnforcementReferences(
    input.enforcement.references,
    input.seizure.references,
  );
  if (compared.contradictions.length > 0) {
    return result(ownerScope, input.createdAt, {
      status: "CONFLICTING_REVIEW_REQUIRED",
      reason: "EXPLICIT_REFERENCE_CONFLICT",
      ...compared,
    });
  }
  if (compared.matchedKeys.length === 0) {
    return result(ownerScope, input.createdAt, {
      status: "INFORMATION_PENDING",
      reason: "NO_SHARED_EXPLICIT_REFERENCE",
    });
  }

  const enforcementAct = uniqueEntity<AdministrativeActV1>(
    input.enforcement.entities,
    "ADMINISTRATIVE_ACT",
    "enforcementSeizureRelation.enforcementAct",
  );
  const seizureAct = uniqueEntity<AdministrativeActV1>(
    input.seizure.entities,
    "ADMINISTRATIVE_ACT",
    "enforcementSeizureRelation.seizureAct",
  );
  if (!enforcementAct || !seizureAct) throw invalidRelationInput();
  const matchingEvidence = relationEvidence(
    enforcementAct,
    seizureAct,
    compared.matchedKeys,
  );
  const relationships: RelationshipV1[] = [relationship({
    source: seizureAct,
    target: enforcementAct,
    relationType: "ENFORCES",
    matchingEvidence,
    ruleId: "enforcement-seizure.explicit-reference.v1",
    explanation:
      "La diligencia de embargo y la providencia comparten una referencia administrativa explícita; el vínculo queda pendiente de revisión.",
  })];
  const debt = uniqueEntity<DebtClaimV1>(
    input.enforcement.entities,
    "DEBT_CLAIM",
    "enforcementSeizureRelation.enforcementDebt",
  );
  if (debt) {
    relationships.push(relationship({
      source: seizureAct,
      target: debt,
      relationType: "ORDERS_SEIZURE",
      matchingEvidence,
      ruleId: "enforcement-seizure.explicit-debt-reference.v1",
      explanation:
        "La diligencia ordena un embargo respecto de la deuda identificada mediante la referencia explícita compartida.",
    }));
  }
  return result(ownerScope, input.createdAt, {
    status: "LINKED_REVIEW_REQUIRED",
    reason: "EXPLICIT_ENFORCEMENT_REFERENCE_LINK",
    matchedKeys: compared.matchedKeys,
    relationships,
  });
}

/**
 * Relates a response, third-party transfer or release to the exact seizure
 * order it cites. It never marks the seizure as currently active or released.
 */
export function linkSeizureFollowUpV1(
  input: LinkSeizureFollowUpInputV1,
): EnforcementSeizureRelationResultV1 {
  assertExactDataRecordV1(input, "seizureFollowUpRelationInput", [
    "ownerScope",
    "seizure",
    "followUp",
    "createdAt",
  ]);
  const ownerScope = validateOwnerAndTimestamp(input.ownerScope, input.createdAt);
  assertSeizureOutput(input.seizure, ownerScope, "seizureFollowUpRelationInput.seizure");
  assertSeizureOutput(input.followUp, ownerScope, "seizureFollowUpRelationInput.followUp");
  if (
    input.seizure.status !== "REVIEW_REQUIRED" ||
    input.followUp.status !== "REVIEW_REQUIRED" ||
    input.seizure.seizureFacts.documentKind !== "SEIZURE_ORDER"
  ) {
    return result(ownerScope, input.createdAt, {
      status: "INFORMATION_PENDING",
      reason: "EXTRACTOR_OUTPUT_NOT_RECOGNIZED",
    });
  }
  if (![
    "SEIZURE_RELEASE",
    "THIRD_PARTY_RESPONSE",
    "THIRD_PARTY_PAYMENT",
  ].includes(String(input.followUp.seizureFacts.documentKind))) {
    return result(ownerScope, input.createdAt, {
      status: "INFORMATION_PENDING",
      reason: "UNSUPPORTED_SEIZURE_FOLLOW_UP",
    });
  }

  const baseIds = referenceValues(input.seizure.references, "SEIZURE_ORDER_ID");
  const followUpIds = referenceValues(input.followUp.references, "SEIZURE_ORDER_ID");
  if (baseIds.length === 0 || followUpIds.length === 0) {
    return result(ownerScope, input.createdAt, {
      status: "INFORMATION_PENDING",
      reason: "NO_SHARED_EXPLICIT_REFERENCE",
    });
  }
  if (!intersects(baseIds, followUpIds)) {
    return result(ownerScope, input.createdAt, {
      status: "CONFLICTING_REVIEW_REQUIRED",
      reason: "EXPLICIT_REFERENCE_CONFLICT",
      contradictions: ["SEIZURE_ORDER_ID_MISMATCH"],
    });
  }

  const baseConstraint = uniqueEntity<AssetConstraintV1>(
    input.seizure.entities,
    "ASSET_CONSTRAINT",
    "seizureFollowUpRelation.baseConstraint",
  );
  if (!baseConstraint || baseConstraint.constraintType !== "SEIZURE") {
    throw invalidRelationInput();
  }
  const followUpAct = uniqueEntity<AdministrativeActV1>(
    input.followUp.entities,
    "ADMINISTRATIVE_ACT",
    "seizureFollowUpRelation.followUpAct",
  );
  if (!followUpAct) throw invalidRelationInput();
  const matchingEvidence = relationEvidence(
    followUpAct,
    baseConstraint,
    ["SEIZURE_ORDER_ID"],
  );
  const relationSpec = followUpRelationSpec(input.followUp, followUpAct, baseConstraint);
  return result(ownerScope, input.createdAt, {
    status: "LINKED_REVIEW_REQUIRED",
    reason: "EXPLICIT_SEIZURE_ORDER_LINK",
    matchedKeys: ["SEIZURE_ORDER_ID"],
    relationships: [relationship({
      ...relationSpec,
      matchingEvidence,
    })],
  });
}

function followUpRelationSpec(
  followUp: SeizureExtractorOutputV1,
  followUpAct: AdministrativeActV1,
  baseConstraint: AssetConstraintV1,
): Readonly<{
  source: AdministrativeEntityV1;
  target: AdministrativeEntityV1;
  relationType: RelationTypeV1;
  ruleId: string;
  explanation: string;
}> {
  switch (followUp.seizureFacts.documentKind) {
    case "SEIZURE_RELEASE": {
      const release = uniqueEntity<AssetConstraintV1>(
        followUp.entities,
        "ASSET_CONSTRAINT",
        "seizureFollowUpRelation.releaseConstraint",
      );
      if (!release || release.constraintType !== "RELEASE") throw invalidRelationInput();
      return Object.freeze({
        source: release,
        target: baseConstraint,
        relationType: "RELEASES_SEIZURE",
        ruleId: "seizure-follow-up.explicit-release.v1",
        explanation:
          "El documento de levantamiento cita de forma explícita la diligencia; no se elimina el embargo histórico ni se infiere su estado actual.",
      });
    }
    case "THIRD_PARTY_RESPONSE":
      return Object.freeze({
        source: followUpAct,
        target: baseConstraint,
        relationType: "RESPONDS_TO_SEIZURE",
        ruleId: "seizure-follow-up.explicit-third-party-response.v1",
        explanation:
          "La contestación del tercero identifica de forma explícita la diligencia de embargo.",
      });
    case "THIRD_PARTY_PAYMENT": {
      const payment = uniqueEntity<PaymentEventV1>(
        followUp.entities,
        "PAYMENT_EVENT",
        "seizureFollowUpRelation.thirdPartyPayment",
      );
      if (!payment) throw invalidRelationInput();
      return Object.freeze({
        source: payment,
        target: baseConstraint,
        relationType: "TRANSFERS_SEIZED_FUNDS",
        ruleId: "seizure-follow-up.explicit-third-party-transfer.v1",
        explanation:
          "El justificante declara un ingreso del tercero para la diligencia citada; no se recalcula ni se confirma un saldo distinto del impreso.",
      });
    }
    default:
      throw invalidRelationInput();
  }
}

function compareEnforcementReferences(
  enforcement: readonly ReferenceV1[],
  seizure: readonly ReferenceV1[],
): Readonly<{
  matchedKeys: readonly EnforcementSeizureMatchKeyV1[];
  contradictions: readonly EnforcementSeizureContradictionV1[];
}> {
  const specs = Object.freeze([
    ["DEBT_KEY", "DEBT_KEY", "DEBT_KEY_MISMATCH"],
    ["LIQUIDATION_KEY", "LIQUIDATION_KEY", "LIQUIDATION_KEY_MISMATCH"],
    ["ACT_ID", "ENFORCEMENT_ACT_REFERENCE", "ENFORCEMENT_ACT_REFERENCE_MISMATCH"],
  ] as const satisfies readonly [
    ReferenceTypeV1,
    EnforcementSeizureMatchKeyV1,
    EnforcementSeizureContradictionV1,
  ][]);
  const matched: EnforcementSeizureMatchKeyV1[] = [];
  const contradictions: EnforcementSeizureContradictionV1[] = [];
  for (const [referenceType, matchKey, contradiction] of specs) {
    const left = referenceValues(enforcement, referenceType);
    const right = referenceValues(seizure, referenceType);
    if (left.length === 0 || right.length === 0) continue;
    if (intersects(left, right)) matched.push(matchKey);
    else contradictions.push(contradiction);
  }
  return Object.freeze({
    matchedKeys: freezeSorted(matched),
    contradictions: freezeSorted(contradictions),
  });
}

function referenceValues(
  references: readonly ReferenceV1[],
  referenceType: ReferenceTypeV1,
): readonly string[] {
  return Object.freeze([...new Set(
    references
      .filter((reference) => reference.referenceType === referenceType)
      .map((reference) => reference.normalizedValue),
  )].sort());
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  const values = new Set(left);
  return right.some((value) => values.has(value));
}

function relationship(input: Readonly<{
  source: AdministrativeEntityV1;
  target: AdministrativeEntityV1;
  relationType: RelationTypeV1;
  matchingEvidence: readonly string[];
  ruleId: string;
  explanation: string;
}>): RelationshipV1 {
  return createRelationshipV1({
    relationshipId: relationId(
      input.source.entityId,
      input.target.entityId,
      input.relationType,
    ),
    sourceEntityId: input.source.entityId,
    targetEntityId: input.target.entityId,
    relationType: input.relationType,
    confidenceLevel: "EXACT",
    matchingEvidence: input.matchingEvidence,
    contradictoryEvidence: Object.freeze([]),
    ruleId: input.ruleId,
    createdAutomatically: true,
    userConfirmed: false,
    explanation: input.explanation,
  });
}

function relationEvidence(
  source: AdministrativeEntityV1,
  target: AdministrativeEntityV1,
  matchedKeys: readonly EnforcementSeizureMatchKeyV1[],
): readonly string[] {
  return Object.freeze([...new Set([
    ...source.evidence.sourceSegmentIds,
    ...target.evidence.sourceSegmentIds,
    ...matchedKeys.map((key) => `match:${key.toLowerCase()}`),
  ])].sort());
}

function relationId(sourceId: string, targetId: string, relationType: RelationTypeV1): string {
  return `relationship:${stableHash(`${sourceId}|${targetId}|${relationType}`)}`;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function uniqueEntity<T extends AdministrativeEntityV1>(
  entities: readonly AdministrativeEntityV1[],
  entityKind: T["entityKind"],
  path: string,
): T | null {
  const matches = entities.filter((entity) => entity.entityKind === entityKind);
  if (matches.length > 1) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
  return (matches[0] as T | undefined) ?? null;
}

function assertCoreOutput(
  output: ExtractorOutputV1,
  ownerScope: string,
  extractorId: "payment-order" | "seizure",
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
    !Object.isFrozen(output.references) ||
    output.entities.some((entity) => entity.ownerScope !== ownerScope)
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

function assertSeizureOutput(
  output: SeizureExtractorOutputV1,
  ownerScope: string,
  path: string,
): void {
  assertCoreOutput(output, ownerScope, "seizure", path);
  if (
    output.extractorId !== "seizure" ||
    !Object.isFrozen(output.seizureFacts) ||
    output.retainedSourceContent !== "NONE" ||
    output.stateDecisionPolicy !==
      "DOCUMENT_KIND_ONLY_NO_CURRENT_ENFORCEMENT_STATE_INFERENCE" ||
    output.balanceDecisionPolicy !==
      "PRINTED_COMPONENTS_ONLY_NO_BALANCE_RECALCULATION"
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", path);
  }
}

function validateOwnerAndTimestamp(ownerScope: string, createdAt: string): string {
  assertBoundedOwnerScope(ownerScope, "relationInput.ownerScope");
  if (
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt)) ||
    new Date(Date.parse(createdAt)).toISOString() !== createdAt
  ) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationInput.createdAt");
  }
  return ownerScope;
}

function result(
  ownerScope: string,
  createdAt: string,
  input: Readonly<{
    status: RelationEngineStatusV1;
    reason: RelationEngineReasonV1;
    matchedKeys?: readonly EnforcementSeizureMatchKeyV1[];
    contradictions?: readonly EnforcementSeizureContradictionV1[];
    relationships?: readonly RelationshipV1[];
  }>,
): EnforcementSeizureRelationResultV1 {
  return Object.freeze({
    contractVersion: FISCAL_NOTIFICATION_EXTRACTOR_CORE_VERSION_V1,
    engineVersion: ENFORCEMENT_SEIZURE_RELATION_ENGINE_VERSION_V1,
    status: input.status,
    reason: input.reason,
    ownerScope,
    matchedKeys: freezeSorted(input.matchedKeys ?? []),
    contradictions: freezeSorted(input.contradictions ?? []),
    relationships: Object.freeze([...(input.relationships ?? [])]),
    createdAt,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
    balanceMutationPolicy: "NO_BALANCE_OR_CURRENT_STATE_MUTATION",
    automaticEffect: "NONE",
    retainedSourceContent: "NONE",
  });
}

function freezeSorted<T extends string>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)].sort());
}

function invalidRelationInput(): FiscalNotificationInputError {
  return new FiscalNotificationInputError("INVALID_INPUT", "relationInput.entities");
}

export const ENFORCEMENT_SEIZURE_RELATION_ENGINE_RELEASE_V1 = Object.freeze({
  version: ENFORCEMENT_SEIZURE_RELATION_ENGINE_VERSION_V1,
  exactMatchKeys: Object.freeze([
    "DEBT_KEY",
    "LIQUIDATION_KEY",
    "ENFORCEMENT_ACT_REFERENCE",
    "SEIZURE_ORDER_ID",
  ] as const),
  amountOnlyRelationPolicy: "PROHIBITED",
  followUpTypes: Object.freeze([
    "SEIZURE_RELEASE",
    "THIRD_PARTY_RESPONSE",
    "THIRD_PARTY_PAYMENT",
  ] as const),
  balanceMutationPolicy: "NO_BALANCE_OR_CURRENT_STATE_MUTATION",
  sourceContentPolicy: "STRUCTURED_FACTS_ONLY_NO_RAW_SOURCE",
  actionPolicy: "NO_DEBT_PAYMENT_DEADLINE_SEIZURE_OR_ACCOUNTING_ACTION",
} as const);
