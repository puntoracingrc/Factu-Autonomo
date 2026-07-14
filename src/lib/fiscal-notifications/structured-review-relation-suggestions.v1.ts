import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import { MAX_FISCAL_RELATION_CANDIDATES } from "./relation-types";
import type {
  DocumentRelation,
  ExternalReference,
  ExternalReferenceType,
  FieldEvidence,
  FiscalNotificationsWorkspace,
} from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

export const STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1 =
  "fiscal-notification-explicit-reference-relations/1.0.0" as const;

export type AppendStructuredReviewRelationSuggestionsResultV1 =
  | {
      readonly status: "APPLIED";
      readonly addedRelationIds: readonly string[];
      readonly workspace: FiscalNotificationsWorkspace;
    }
  | {
      readonly status: "UNCHANGED";
      readonly addedRelationIds: readonly [];
      readonly workspace: FiscalNotificationsWorkspace;
    }
  | {
      readonly status: "REVIEW_REQUIRED";
      readonly reason:
        | "CANDIDATE_LIMIT_EXCEEDED"
        | "RELATION_ID_COLLISION"
        | "RESULT_INVALID";
      readonly addedRelationIds: readonly [];
      readonly workspace: FiscalNotificationsWorkspace;
    };

const STRONG_REFERENCE_TYPES = new Set<ExternalReferenceType>([
  "CSV",
  "DOCUMENT_REFERENCE",
  "EXPEDIENT_NUMBER",
  "PROCEDURE_NUMBER",
  "LIQUIDATION_KEY",
  "DEBT_KEY",
  "PAYMENT_JUSTIFICANTE",
  "NOTIFICATION_ID",
  "REQUEST_NUMBER",
  "OFFICIAL_REGISTRY_NUMBER",
]);

interface ReferenceGroup {
  readonly referenceType: ExternalReferenceType;
  readonly documentIds: Set<string>;
}

interface PendingRelation {
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly matchingReferenceTypes: Set<ExternalReferenceType>;
}

/**
 * Conserva relaciones sugeridas únicamente cuando dos fichas comparten un
 * identificador explícito del documento. La coincidencia es determinista,
 * pero nunca se interpreta como causalidad, pago o identidad jurídica del
 * acto; por eso la relación permanece SUGGESTED.
 */
export function appendStructuredReviewRelationSuggestionsV1(input: {
  readonly ownerScope: string;
  readonly workspace: FiscalNotificationsWorkspace;
  readonly createdAt: string;
}): AppendStructuredReviewRelationSuggestionsResultV1 {
  const original = parseFiscalNotificationsWorkspaceForPersistenceV1(
    input.workspace,
    input.ownerScope,
  );
  if (!original) {
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_RELATION_WORKSPACE");
  }
  if (
    !isIsoTimestamp(input.createdAt) ||
    input.createdAt !== original.updatedAt
  ) {
    return reviewRequired(original, "RESULT_INVALID");
  }

  const documentsById = new Map(
    original.documents.map((document) => [document.id, document]),
  );
  const evidenceById = new Map(
    original.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const groups = new Map<string, ReferenceGroup>();

  for (const reference of original.references) {
    const document = documentsById.get(reference.documentId);
    if (
      !document ||
      !isEligibleExplicitReference(reference, evidenceById)
    ) {
      continue;
    }
    const key = JSON.stringify([
      document.authorityId,
      reference.referenceType,
      reference.issuer,
      reference.normalizedValue,
    ]);
    const group = groups.get(key) ?? {
      referenceType: reference.referenceType,
      documentIds: new Set<string>(),
    };
    group.documentIds.add(reference.documentId);
    groups.set(key, group);
  }

  const existingPairs = new Set(
    original.relations.map((relation) =>
      pairKey(relation.sourceDocumentId, relation.targetDocumentId),
    ),
  );
  const pendingByPair = new Map<string, PendingRelation>();
  for (const group of groups.values()) {
    const documentIds = [...group.documentIds].sort();
    if (documentIds.length < 2) continue;
    const anchor = documentIds[0]!;
    for (let index = 1; index < documentIds.length; index += 1) {
      const target = documentIds[index]!;
      const key = pairKey(anchor, target);
      if (existingPairs.has(key)) continue;
      const pending = pendingByPair.get(key) ?? {
        sourceDocumentId: anchor,
        targetDocumentId: target,
        matchingReferenceTypes: new Set<ExternalReferenceType>(),
      };
      pending.matchingReferenceTypes.add(group.referenceType);
      pendingByPair.set(key, pending);
      if (pendingByPair.size > MAX_FISCAL_RELATION_CANDIDATES) {
        return reviewRequired(original, "CANDIDATE_LIMIT_EXCEEDED");
      }
    }
  }

  if (pendingByPair.size === 0) {
    return Object.freeze({
      status: "UNCHANGED",
      addedRelationIds: Object.freeze([]) as readonly [],
      workspace: original,
    });
  }
  if (
    original.relations.length + pendingByPair.size >
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems
  ) {
    return reviewRequired(original, "CANDIDATE_LIMIT_EXCEEDED");
  }

  const existingIds = new Set(original.relations.map((relation) => relation.id));
  const additions: DocumentRelation[] = [];
  for (const pending of [...pendingByPair.values()].sort(comparePending)) {
    const id = relationId(
      pending.sourceDocumentId,
      pending.targetDocumentId,
    );
    if (existingIds.has(id)) {
      return reviewRequired(original, "RELATION_ID_COLLISION");
    }
    existingIds.add(id);
    additions.push({
      id,
      ownerScope: input.ownerScope,
      sourceDocumentId: pending.sourceDocumentId,
      targetDocumentId: pending.targetDocumentId,
      relationType: "POSSIBLY_RELATED",
      confidenceBand: "HIGH",
      score: 100,
      evidence: {
        matchingReferenceTypes: [...pending.matchingReferenceTypes].sort(),
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [
          "La coincidencia no demuestra por sí sola causalidad, pago o estado jurídico.",
        ],
      },
      algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
      status: "SUGGESTED",
      createdAt: input.createdAt,
    });
  }

  const candidate: FiscalNotificationsWorkspace = {
    ...original,
    relations: [...original.relations, ...additions],
  };
  const parsed = parseFiscalNotificationsWorkspaceForPersistenceV1(
    candidate,
    input.ownerScope,
  );
  if (!parsed) return reviewRequired(original, "RESULT_INVALID");
  return Object.freeze({
    status: "APPLIED",
    addedRelationIds: Object.freeze(additions.map((item) => item.id)),
    workspace: parsed,
  });
}

function isEligibleExplicitReference(
  reference: ExternalReference,
  evidenceById: ReadonlyMap<string, FieldEvidence>,
): boolean {
  if (
    !STRONG_REFERENCE_TYPES.has(reference.referenceType) ||
    reference.confirmationStatus === "REJECTED" ||
    reference.confidence !== "EXACT" ||
    reference.occurrenceIds.length === 0 ||
    !isExactBoundedValue(reference.normalizedValue) ||
    !isExactBoundedValue(reference.issuer)
  ) {
    return false;
  }
  if (
    reference.extractionMethod === "RULE" &&
    reference.confirmationStatus === "PENDING"
  ) {
    return reference.occurrenceIds.every((id) => {
      const evidence = evidenceById.get(id);
      return (
        evidence?.documentId === reference.documentId &&
        evidence.extractionMethod === "RULE" &&
        evidence.confidence === "EXACT" &&
        evidence.assertionType === "EXPLICIT_IN_DOCUMENT"
      );
    });
  }
  if (
    reference.extractionMethod === "USER" &&
    reference.confirmationStatus === "CONFIRMED"
  ) {
    return reference.occurrenceIds.every((id) => {
      const evidence = evidenceById.get(id);
      return (
        evidence?.documentId === reference.documentId &&
        evidence.extractionMethod === "USER" &&
        evidence.confidence === "EXACT" &&
        evidence.assertionType === "USER_CONFIRMED" &&
        typeof evidence.confirmedAt === "string" &&
        typeof evidence.confirmedBy === "string"
      );
    });
  }
  return false;
}

function isExactBoundedValue(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
  );
}

function pairKey(left: string, right: string): string {
  return JSON.stringify(left < right ? [left, right] : [right, left]);
}

function relationId(left: string, right: string): string {
  const [source, target] = left < right ? [left, right] : [right, left];
  return `relation:explicit:${source}:${target}`;
}

function comparePending(left: PendingRelation, right: PendingRelation): number {
  const leftKey = pairKey(left.sourceDocumentId, left.targetDocumentId);
  const rightKey = pairKey(right.sourceDocumentId, right.targetDocumentId);
  return leftKey.localeCompare(rightKey);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function reviewRequired(
  workspace: FiscalNotificationsWorkspace,
  reason: Extract<
    AppendStructuredReviewRelationSuggestionsResultV1,
    { status: "REVIEW_REQUIRED" }
  >["reason"],
): AppendStructuredReviewRelationSuggestionsResultV1 {
  return Object.freeze({
    status: "REVIEW_REQUIRED",
    reason,
    addedRelationIds: Object.freeze([]) as readonly [],
    workspace,
  });
}
