import { FiscalNotificationInputError, assertBoundedId } from "../input-contract";
import type { FiscalNotificationDocumentFamilyIdV3 } from "../knowledge/document-families.v3";
import type { DocumentSegmentV1 } from "./document-segment.v1";
import type { MonetaryComponentV1 } from "./monetary-component.v1";
import type { ProceduralDateV1 } from "./procedural-date.v1";
import type { ReferenceV1 } from "./reference.v1";
import { assertBoundedLiteralV1, assertConfidenceV1, assertExactDataRecordV1, freezeUniqueIdsV1 } from "./shared.v1";

export const ADMINISTRATIVE_ENTITY_KINDS_V1 = Object.freeze([
  "TAX_DOCUMENT",
  "ADMINISTRATIVE_ACT",
  "TAX_PROCEDURE",
  "DEBT_CLAIM",
  "PAYMENT_EVENT",
  "REFUND_EVENT",
  "NOTIFICATION_EVENT",
  "ASSET_CONSTRAINT",
  "REVIEW_EVENT",
  "PARTY",
] as const);
export type AdministrativeEntityKindV1 = (typeof ADMINISTRATIVE_ENTITY_KINDS_V1)[number];

export const PARTY_ROLES_V1 = Object.freeze([
  "TAXPAYER",
  "PRIMARY_DEBTOR",
  "LIABLE_PARTY",
  "SUCCESSOR",
  "PAYER",
  "GARNISHED_THIRD_PARTY",
  "TENANT",
  "FINANCIAL_ENTITY",
  "REPRESENTATIVE",
  "ISSUING_AUTHORITY",
] as const);
export type PartyRoleV1 = (typeof PARTY_ROLES_V1)[number];

export interface EntityEvidenceV1 {
  readonly sourceDocumentIds: readonly string[];
  readonly sourceSegmentIds: readonly string[];
  readonly evidenceBasis: "EXPLICIT_DOCUMENT_TEXT" | "USER_CONFIRMED" | "NORMALIZED_OFFICIAL_EVIDENCE";
  readonly confidence: number;
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW";
}

interface EntityBaseV1 {
  readonly entityId: string;
  readonly ownerScope: string;
  readonly entityKind: AdministrativeEntityKindV1;
  readonly evidence: EntityEvidenceV1;
}

export interface TaxDocumentV1 extends EntityBaseV1 {
  readonly entityKind: "TAX_DOCUMENT";
  readonly contentHash: `sha256:${string}`;
  readonly pageCount: number;
  readonly segments: readonly DocumentSegmentV1[];
  readonly administrativeEffect: "NONE_BY_DOCUMENT_ALONE";
}

export interface AdministrativeActV1 extends EntityBaseV1 {
  readonly entityKind: "ADMINISTRATIVE_ACT";
  readonly familyId: FiscalNotificationDocumentFamilyIdV3;
  readonly actSubtype: string;
  readonly references: readonly ReferenceV1[];
  readonly dates: readonly ProceduralDateV1[];
}

export interface TaxProcedureV1 extends EntityBaseV1 {
  readonly entityKind: "TAX_PROCEDURE";
  readonly procedureType: string;
  readonly referenceIds: readonly string[];
  readonly actIds: readonly string[];
}

export interface DebtClaimV1 extends EntityBaseV1 {
  readonly entityKind: "DEBT_CLAIM";
  readonly creationBasis: "EXPLICITLY_PRINTED_DEBT" | "USER_CONFIRMED_DEBT";
  readonly monetaryComponents: readonly MonetaryComponentV1[];
  readonly referenceIds: readonly string[];
}

export interface PaymentEventV1 extends EntityBaseV1 {
  readonly entityKind: "PAYMENT_EVENT";
  readonly paymentStatus: "ORDERED" | "ATTEMPTED" | "PAID" | "PARTIALLY_PAID" | "REJECTED" | "RETURNED" | "ANNULLED";
  readonly monetaryComponents: readonly MonetaryComponentV1[];
  readonly referenceIds: readonly string[];
}

export interface RefundEventV1 extends EntityBaseV1 {
  readonly entityKind: "REFUND_EVENT";
  readonly refundStatus: "REQUESTED" | "PROPOSED" | "RECOGNIZED" | "RETAINED" | "COMPENSATED" | "PAID";
  readonly monetaryComponents: readonly MonetaryComponentV1[];
  readonly referenceIds: readonly string[];
}

export interface NotificationEventV1 extends EntityBaseV1 {
  readonly entityKind: "NOTIFICATION_EVENT";
  readonly notificationStatus: "AVAILABLE" | "ACCESSED" | "REJECTED" | "ATTEMPTED" | "DELIVERED" | "PUBLISHED";
  readonly dates: readonly ProceduralDateV1[];
  readonly referenceIds: readonly string[];
}

export interface AssetConstraintV1 extends EntityBaseV1 {
  readonly entityKind: "ASSET_CONSTRAINT";
  readonly constraintType: "SEIZURE" | "PRECAUTIONARY_MEASURE" | "RELEASE";
  readonly assetClass: string;
  readonly monetaryComponents: readonly MonetaryComponentV1[];
  readonly referenceIds: readonly string[];
}

export interface ReviewEventV1 extends EntityBaseV1 {
  readonly entityKind: "REVIEW_EVENT";
  readonly reviewType: "ALLEGATION" | "APPEAL" | "CLAIM" | "SUSPENSION_REQUEST" | "SUSPENSION_DECISION" | "RESOLUTION";
  readonly referenceIds: readonly string[];
  readonly dates: readonly ProceduralDateV1[];
}

export interface PartyV1 extends EntityBaseV1 {
  readonly entityKind: "PARTY";
  readonly displayName: string | null;
  readonly taxIdReferenceId: string | null;
  readonly roles: readonly PartyRoleV1[];
}

export type AdministrativeEntityV1 =
  | TaxDocumentV1 | AdministrativeActV1 | TaxProcedureV1 | DebtClaimV1
  | PaymentEventV1 | RefundEventV1 | NotificationEventV1 | AssetConstraintV1
  | ReviewEventV1 | PartyV1;

export const RELATION_TYPES_V1 = Object.freeze([
  "CONTAINS", "NOTIFIES", "REFERENCES", "RESPONDS_TO", "REQUESTS", "PROPOSES",
  "RESOLVES", "DERIVES_FROM", "SUPERSEDES", "MODIFIES", "CONFIRMS", "ANNULS",
  "SUSPENDS", "LIFTS_SUSPENSION", "CREATES_EXPLICIT_DEBT", "CLAIMS_PAYMENT_OF",
  "PAYS", "PARTIALLY_PAYS", "PAYMENT_ATTEMPT_FOR", "PAYMENT_REJECTED_FOR",
  "PAYMENT_RETURNED_FOR", "LEAVES_PENDING_BALANCE", "DEFERS", "SPLITS_INTO_INSTALLMENTS",
  "MODIFIES_INSTALLMENT_PLAN", "BREACHES_INSTALLMENT_PLAN", "COMPENSATES",
  "PARTIALLY_COMPENSATES", "RECOGNIZES_REFUND", "PAYS_REFUND", "RETAINS_REFUND",
  "INITIATES_ENFORCEMENT", "ENFORCES", "ORDERS_SEIZURE", "EXECUTES_SEIZURE",
  "RESPONDS_TO_SEIZURE", "TRANSFERS_SEIZED_FUNDS", "RELEASES_SEIZURE",
  "INITIATES_PENALTY", "IMPOSES_PENALTY", "APPEALS", "DECIDES_APPEAL",
  "DERIVES_LIABILITY", "CLOSES_PROCEDURE",
] as const);
export type RelationTypeV1 = (typeof RELATION_TYPES_V1)[number];
export type RelationshipConfidenceLevelV1 =
  | "EXACT" | "EXPLICIT_REFERENCE" | "HIGHLY_PROBABLE" | "POSSIBLE" | "CONFLICTING" | "REJECTED";

export interface RelationshipV1 {
  readonly relationshipId: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly relationType: RelationTypeV1;
  readonly confidenceLevel: RelationshipConfidenceLevelV1;
  readonly matchingEvidence: readonly string[];
  readonly contradictoryEvidence: readonly string[];
  readonly ruleId: string;
  readonly createdAutomatically: boolean;
  readonly userConfirmed: boolean;
  readonly explanation: string;
}

export function createRelationshipV1(input: RelationshipV1): RelationshipV1 {
  assertExactDataRecordV1(input, "relationship", [
    "relationshipId", "sourceEntityId", "targetEntityId", "relationType", "confidenceLevel",
    "matchingEvidence", "contradictoryEvidence", "ruleId", "createdAutomatically",
    "userConfirmed", "explanation",
  ]);
  assertBoundedId(input.relationshipId, "relationship.relationshipId");
  assertBoundedId(input.sourceEntityId, "relationship.sourceEntityId");
  assertBoundedId(input.targetEntityId, "relationship.targetEntityId");
  if (input.sourceEntityId === input.targetEntityId) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.targetEntityId");
  }
  if (!RELATION_TYPES_V1.includes(input.relationType)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.relationType");
  }
  if (!["EXACT", "EXPLICIT_REFERENCE", "HIGHLY_PROBABLE", "POSSIBLE", "CONFLICTING", "REJECTED"].includes(input.confidenceLevel)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.confidenceLevel");
  }
  const matchingEvidence = freezeUniqueIdsV1(input.matchingEvidence, "relationship.matchingEvidence", 128);
  const contradictoryEvidence = freezeUniqueIdsV1(input.contradictoryEvidence, "relationship.contradictoryEvidence", 128);
  assertBoundedId(input.ruleId, "relationship.ruleId");
  if (typeof input.createdAutomatically !== "boolean" || typeof input.userConfirmed !== "boolean") {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.confirmation");
  }
  if (input.createdAutomatically && !["EXACT", "EXPLICIT_REFERENCE"].includes(input.confidenceLevel)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.createdAutomatically");
  }
  if (input.createdAutomatically && matchingEvidence.length === 0) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.matchingEvidence");
  }
  if (input.confidenceLevel === "REJECTED" && input.userConfirmed) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "relationship.userConfirmed");
  }
  assertBoundedLiteralV1(input.explanation, "relationship.explanation", { maxChars: 1_000 });
  return Object.freeze({ ...input, matchingEvidence, contradictoryEvidence });
}

export function assertEntityEvidenceV1(value: EntityEvidenceV1, path = "evidence"): void {
  freezeUniqueIdsV1(value.sourceDocumentIds, `${path}.sourceDocumentIds`, 128);
  freezeUniqueIdsV1(value.sourceSegmentIds, `${path}.sourceSegmentIds`, 256);
  if (!["EXPLICIT_DOCUMENT_TEXT", "USER_CONFIRMED", "NORMALIZED_OFFICIAL_EVIDENCE"].includes(value.evidenceBasis)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", `${path}.evidenceBasis`);
  }
  assertConfidenceV1(value.confidence, `${path}.confidence`);
  if (value.requiresHumanReview !== true || value.materializationPolicy !== "PROHIBITED_UNTIL_HUMAN_REVIEW") {
    throw new FiscalNotificationInputError("INVALID_INPUT", `${path}.materializationPolicy`);
  }
}
