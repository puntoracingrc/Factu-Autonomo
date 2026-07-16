import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import { MAX_FISCAL_RELATION_CANDIDATES } from "./relation-types";
import {
  evaluateFiscalNotificationDocumentChainEdgeV2,
  getFiscalNotificationFamilyChainAdjacencyV2,
  isFiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationDocumentChainIdV2,
  type FiscalNotificationDocumentFamilyIdV2,
  type FiscalNotificationRelationTypeIdV2,
} from "./document-chain-rules.v2";
import type {
  AdministrativeDocument,
  DocumentRelation,
  ExternalReference,
  ExternalReferenceType,
  FieldEvidence,
  FiscalNotificationsWorkspace,
} from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";
import {
  normalizeFiscalNotificationIssuerV2,
  normalizeFiscalNotificationReferenceV2,
} from "./exact-reference-index.v2";

export const STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1 =
  "fiscal-notification-explicit-reference-relations/1.0.0" as const;
export const STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1 =
  "fiscal-notification-typed-explicit-relations/1.0.0" as const;
export const STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2 =
  "fiscal-notification-declared-document-chains/2.0.0" as const;

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
  "NRC",
  "NOTIFICATION_ID",
  "REQUEST_NUMBER",
  "OFFICIAL_REGISTRY_NUMBER",
]);
const ENFORCEMENT_CONTEXT_REFERENCE_TYPES = new Set<ExternalReferenceType>([
  "DEBT_KEY",
  "LIQUIDATION_KEY",
  "DOCUMENT_REFERENCE",
]);
const PRIMARY_ACT_RELATION_TYPES = new Set<FiscalNotificationRelationTypeIdV2>([
  "RESPONDS_TO_SEIZURE",
  "TRANSFERS_SEIZED_FUNDS",
  "RELEASES_SEIZURE",
]);
const NRC_OPERATION_RELATION_TYPES = new Set<FiscalNotificationRelationTypeIdV2>([
  "PAYMENT_EVIDENCE_FOR",
  "PAYMENT_FAILED_FOR",
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

type RelationPlan =
  | { readonly kind: "SKIP_CONFLICT" }
  | {
      readonly kind: "GENERIC_SUGGESTION";
      readonly sourceDocumentId: string;
      readonly targetDocumentId: string;
      readonly relationType: "POSSIBLY_RELATED";
      readonly confidenceBand: "HIGH";
      readonly status: "SUGGESTED";
      readonly algorithmVersion: typeof STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1;
      readonly differences: readonly string[];
    }
  | {
      readonly kind: "CHAIN_EXACT";
      readonly sourceDocumentId: string;
      readonly targetDocumentId: string;
      readonly chainId: FiscalNotificationDocumentChainIdV2;
      readonly relationType: FiscalNotificationRelationTypeIdV2;
      readonly confidenceBand: "EXACT";
      readonly status: "SYSTEM_CONFIRMED_EXACT";
      readonly algorithmVersion: typeof STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2;
      readonly differences: readonly string[];
    };

const LEGACY_DOCUMENT_FAMILIES: Readonly<
  Partial<Record<AdministrativeDocument["documentType"], FiscalNotificationDocumentFamilyIdV2>>
> = Object.freeze({
  AEAT_ENFORCEMENT_ORDER: "collection.enforcement_order",
  AEAT_INSTALLMENT_OR_DEFERRAL_GRANT: "collection.deferral_grant",
  AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL: "collection.deferral_denial",
  AEAT_PAYMENT_FORM: "payment.payment_form",
  AEAT_ASSESSMENT_PROPOSAL: "assessment.allegations_and_proposal",
  AEAT_ASSESSMENT: "assessment.final_provisional_assessment",
  AEAT_SANCTION_PROPOSAL: "sanction.initiation_and_hearing",
  AEAT_SANCTION_DECISION: "sanction.resolution",
});

/**
 * Conserva relaciones únicamente cuando dos fichas comparten un identificador
 * explícito. Las combinaciones documentales conocidas reciben un tipo exacto;
 * el resto permanece como sugerencia genérica. Ninguna relación aplica efectos
 * sobre deudas, pagos, saldos, plazos o asientos.
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
  const referencesByDocument = new Map<string, ExternalReference[]>();
  const groups = new Map<string, ReferenceGroup>();

  for (const reference of original.references) {
    const document = documentsById.get(reference.documentId);
    if (
      !document ||
      !isEligibleExplicitReference(reference, evidenceById)
    ) {
      continue;
    }
    const documentReferences = referencesByDocument.get(reference.documentId) ?? [];
    documentReferences.push(reference);
    referencesByDocument.set(reference.documentId, documentReferences);
    const key = JSON.stringify([
      original.ownerScope,
      reference.referenceType,
      normalizeFiscalNotificationIssuerV2(reference.issuer),
      canonicalReferenceValue(reference),
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
    const plan = planRelation(
      pending,
      documentsById,
      referencesByDocument,
      evidenceById,
    );
    if (plan.kind === "SKIP_CONFLICT") continue;
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
      sourceDocumentId: plan.sourceDocumentId,
      targetDocumentId: plan.targetDocumentId,
      relationType: plan.relationType,
      confidenceBand: plan.confidenceBand,
      score: 100,
      evidence: {
        ...(plan.kind === "CHAIN_EXACT" ? { chainId: plan.chainId } : {}),
        matchingReferenceTypes: [...pending.matchingReferenceTypes].sort(),
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [...plan.differences],
      },
      algorithmVersion: plan.algorithmVersion,
      status: plan.status,
      createdAt: input.createdAt,
    });
  }

  if (additions.length === 0) {
    return Object.freeze({
      status: "UNCHANGED",
      addedRelationIds: Object.freeze([]) as readonly [],
      workspace: original,
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

function planRelation(
  pending: PendingRelation,
  documentsById: ReadonlyMap<string, AdministrativeDocument>,
  referencesByDocument: ReadonlyMap<string, readonly ExternalReference[]>,
  evidenceById: ReadonlyMap<string, FieldEvidence>,
): RelationPlan {
  const left = documentsById.get(pending.sourceDocumentId);
  const right = documentsById.get(pending.targetDocumentId);
  if (!left || !right) return Object.freeze({ kind: "SKIP_CONFLICT" });

  const chainPlan = planDeclaredDocumentChainRelation(left, right);
  if (chainPlan) {
    if (
      pending.matchingReferenceTypes.size === 1 &&
      pending.matchingReferenceTypes.has("NRC") &&
      !NRC_OPERATION_RELATION_TYPES.has(chainPlan.relationType)
    ) {
      return Object.freeze({ kind: "SKIP_CONFLICT" });
    }
    if (
      PRIMARY_ACT_RELATION_TYPES.has(chainPlan.relationType) &&
      !hasExactPrimaryDocumentReferenceMatch(
        chainPlan.sourceDocumentId,
        chainPlan.targetDocumentId,
        referencesByDocument,
        evidenceById,
      )
    ) {
      return genericSuggestion(pending);
    }
    const conflictTypes =
      chainPlan.relationType === "ENFORCES"
        ? ENFORCEMENT_CONTEXT_REFERENCE_TYPES
        : pending.matchingReferenceTypes;
    if (
      hasExplicitConflict(
        left.id,
        right.id,
        conflictTypes,
        referencesByDocument,
      )
    ) {
      return Object.freeze({ kind: "SKIP_CONFLICT" });
    }
    return chainPlan;
  }

  return genericSuggestion(pending);
}

function genericSuggestion(
  pending: PendingRelation,
): Extract<RelationPlan, { kind: "GENERIC_SUGGESTION" }> {
  return Object.freeze({
    kind: "GENERIC_SUGGESTION",
    sourceDocumentId: pending.sourceDocumentId,
    targetDocumentId: pending.targetDocumentId,
    relationType: "POSSIBLY_RELATED",
    confidenceBand: "HIGH",
    status: "SUGGESTED",
    algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
    differences: Object.freeze([
      "La coincidencia no demuestra por sí sola causalidad, pago o estado jurídico.",
    ]),
  });
}

function hasExactPrimaryDocumentReferenceMatch(
  leftDocumentId: string,
  rightDocumentId: string,
  referencesByDocument: ReadonlyMap<string, readonly ExternalReference[]>,
  evidenceById: ReadonlyMap<string, FieldEvidence>,
): boolean {
  const left = new Set(
    (referencesByDocument.get(leftDocumentId) ?? [])
      .filter((reference) => isPrimaryAdministrativeActReference(reference, evidenceById))
      .map(canonicalReferenceValue),
  );
  const right = new Set(
    (referencesByDocument.get(rightDocumentId) ?? [])
      .filter((reference) => isPrimaryAdministrativeActReference(reference, evidenceById))
      .map(canonicalReferenceValue),
  );
  return [...left].some((value) => right.has(value));
}

function isPrimaryAdministrativeActReference(
  reference: ExternalReference,
  evidenceById: ReadonlyMap<string, FieldEvidence>,
): boolean {
  if (
    reference.referenceType !== "DOCUMENT_REFERENCE" ||
    !reference.isPrimary ||
    reference.occurrenceIds.length === 0
  ) {
    return false;
  }
  return reference.occurrenceIds.every((id) => {
    const evidence = evidenceById.get(id);
    if (!evidence || evidence.documentId !== reference.documentId) return false;
    const label = evidence.textSnippet
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
    return label.includes("diligencia") && !label.includes("providencia");
  });
}

function planDeclaredDocumentChainRelation(
  left: AdministrativeDocument,
  right: AdministrativeDocument,
): Extract<RelationPlan, { kind: "CHAIN_EXACT" }> | null {
  const leftFamily = documentFamily(left);
  const rightFamily = documentFamily(right);
  if (!leftFamily || !rightFamily || leftFamily === rightFamily) return null;

  const candidates = [
    ...getFiscalNotificationFamilyChainAdjacencyV2(leftFamily).outgoing.filter(
      (edge) => edge.toFamilyId === rightFamily,
    ),
    ...getFiscalNotificationFamilyChainAdjacencyV2(rightFamily).outgoing.filter(
      (edge) => edge.toFamilyId === leftFamily,
    ),
  ].filter((edge) =>
    evaluateFiscalNotificationDocumentChainEdgeV2({
      chainId: edge.chainId,
      fromFamilyId: edge.fromFamilyId,
      toFamilyId: edge.toFamilyId,
      relationType: edge.relationType,
      printedFavorableOutcome: false,
    }).declared,
  );
  const unique = new Map(
    candidates.map((edge) => [
      JSON.stringify([
        edge.chainId,
        edge.fromFamilyId,
        edge.toFamilyId,
        edge.relationType,
      ]),
      edge,
    ]),
  );
  if (unique.size !== 1) return null;
  const edge = [...unique.values()][0]!;
  const earlierDocument = edge.fromFamilyId === leftFamily ? left : right;
  const laterDocument = edge.toFamilyId === rightFamily ? right : left;
  return Object.freeze({
    kind: "CHAIN_EXACT",
    sourceDocumentId: laterDocument.id,
    targetDocumentId: earlierDocument.id,
    chainId: edge.chainId,
    relationType: edge.relationType,
    confidenceBand: "EXACT",
    status: "SYSTEM_CONFIRMED_EXACT",
    algorithmVersion: STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
    differences: Object.freeze([
      "La referencia oficial coincide exactamente y la dirección figura en una cadena documental declarada.",
      "La relación no cambia saldos, estados, pagos, deudas, plazos ni asientos.",
    ]),
  });
}

function documentFamily(
  document: AdministrativeDocument,
): FiscalNotificationDocumentFamilyIdV2 | null {
  if (isFiscalNotificationDocumentFamilyIdV2(document.documentSubtype)) {
    return document.documentSubtype;
  }
  return LEGACY_DOCUMENT_FAMILIES[document.documentType] ?? null;
}

function hasExplicitConflict(
  leftDocumentId: string,
  rightDocumentId: string,
  referenceTypes: ReadonlySet<ExternalReferenceType>,
  referencesByDocument: ReadonlyMap<string, readonly ExternalReference[]>,
): boolean {
  const left = referencesByDocument.get(leftDocumentId) ?? [];
  const right = referencesByDocument.get(rightDocumentId) ?? [];
  for (const referenceType of referenceTypes) {
    const leftValues = referenceValues(left, referenceType);
    const rightValues = referenceValues(right, referenceType);
    if (
      leftValues.size > 0 &&
      rightValues.size > 0 &&
      ![...leftValues].some((value) => rightValues.has(value))
    ) {
      return true;
    }
  }
  return false;
}

function referenceValues(
  references: readonly ExternalReference[],
  referenceType: ExternalReferenceType,
): ReadonlySet<string> {
  return new Set(
    references
      .filter((reference) => reference.referenceType === referenceType)
      .map(canonicalReferenceValue),
  );
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

function canonicalReferenceValue(reference: ExternalReference): string {
  return normalizeFiscalNotificationReferenceV2(reference.normalizedValue);
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
