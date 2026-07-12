import {
  evaluateEntityRelation,
  type EvaluatedEntityRelation,
  type RelationMatchKey,
} from "./entity-relations";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";
import {
  FISCAL_RELATION_ENGINE_ID,
  FISCAL_RELATION_ENGINE_VERSION,
  MAX_FISCAL_RELATION_CANDIDATES,
} from "./relation-types";
import type {
  ExternalReference,
  FiscalNotificationsWorkspace,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

export interface WorkspaceRelationProposalInput {
  readonly ownerScope: string;
  readonly workspace: FiscalNotificationsWorkspace;
  readonly documentIds: readonly string[];
  readonly createdAt: string;
}

export type WorkspaceRelationProposalResult =
  | {
      readonly status: "COMPLETE";
      readonly requiresHumanReview: boolean;
      readonly candidates: readonly EvaluatedEntityRelation[];
    }
  | {
      readonly status: "INFORMATION_PENDING";
      readonly requiresHumanReview: true;
      readonly reason: "NO_SUPPORTED_CONFIRMED_SIGNAL";
      readonly candidates: readonly [];
    }
  | {
      readonly status: "REVIEW_REQUIRED";
      readonly requiresHumanReview: true;
      readonly reason:
        | "CANDIDATE_LIMIT_EXCEEDED"
        | "AMBIGUOUS_EXPLICIT_REFERENCE"
        | "PROVENANCE_LIMIT_EXCEEDED"
        | "INVALID_CONFIRMED_REFERENCE";
      readonly candidates: readonly [];
    };

interface PendingCandidate {
  kind: "FILE_EXACT" | "DOCUMENT_REFERENCE";
  sourceId: string;
  targetId: string;
  matchingKeys: Set<RelationMatchKey>;
  provenanceEntityIds: Set<string>;
  sourceSha256?: string;
  targetSha256?: string;
}

const INPUT_KEYS = Object.freeze([
  "ownerScope",
  "workspace",
  "documentIds",
  "createdAt",
] as const);
const STRONG_REFERENCE_TYPES = new Set<RelationMatchKey>([
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
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function proposeWorkspaceEntityRelations(
  value: WorkspaceRelationProposalInput,
): WorkspaceRelationProposalResult {
  const input = parseInput(value);
  const workspace = cloneValidatedWorkspace(input.workspace, input.ownerScope);
  if (Date.parse(input.createdAt) < Date.parse(workspace.updatedAt)) {
    throw new Error("FISCAL_NOTIFICATIONS_NON_MONOTONIC_RELATION_EVALUATION");
  }
  const selectedDocumentIds = new Set(input.documentIds);
  const documentsById = new Map(workspace.documents.map((item) => [item.id, item]));
  for (const documentId of selectedDocumentIds) {
    if (!documentsById.has(documentId)) {
      throw new Error("FISCAL_NOTIFICATIONS_RELATION_DOCUMENT_NOT_FOUND");
    }
  }
  const filesById = new Map(workspace.files.map((item) => [item.id, item]));
  const existingDocumentPairs = new Set(
    workspace.relations.map((item) =>
      canonicalPairKey("DOCUMENT", item.sourceDocumentId, item.targetDocumentId),
    ),
  );
  const candidates = new Map<string, PendingCandidate>();

  const addCandidate = (
    key: string,
    candidate: PendingCandidate,
  ): WorkspaceRelationProposalResult | null => {
    const existing = candidates.get(key);
    if (existing) {
      for (const matchingKey of candidate.matchingKeys) {
        existing.matchingKeys.add(matchingKey);
      }
      for (const provenanceId of candidate.provenanceEntityIds) {
        existing.provenanceEntityIds.add(provenanceId);
        if (
          existing.provenanceEntityIds.size >
          FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds
        ) {
          return reviewRequired("PROVENANCE_LIMIT_EXCEEDED");
        }
      }
      return null;
    }
    if (candidates.size >= MAX_FISCAL_RELATION_CANDIDATES) {
      return reviewRequired("CANDIDATE_LIMIT_EXCEEDED");
    }
    candidates.set(key, candidate);
    return null;
  };

  const selectedFileIds = new Set(
    input.documentIds.map((id) => documentsById.get(id)!.fileId),
  );
  const fileIdsByHash = new Map<string, Set<string>>();
  for (const document of workspace.documents) {
    const file = filesById.get(document.fileId);
    if (!file || !file.isImmutableOriginal || !SHA256_PATTERN.test(file.sha256)) {
      continue;
    }
    const fileIds = fileIdsByHash.get(file.sha256) ?? new Set<string>();
    fileIds.add(file.id);
    fileIdsByHash.set(file.sha256, fileIds);
  }
  for (const [sha256, fileIdSet] of fileIdsByHash) {
    const fileIds = [...fileIdSet].sort();
    if (fileIds.length < 2) continue;
    const anchor = fileIds[0]!;
    for (let index = 1; index < fileIds.length; index += 1) {
      const other = fileIds[index]!;
      if (!selectedFileIds.has(anchor) && !selectedFileIds.has(other)) continue;
      const result = addCandidate(canonicalPairKey("FILE", anchor, other), {
        kind: "FILE_EXACT",
        sourceId: anchor,
        targetId: other,
        matchingKeys: new Set(["FILE_SHA256"]),
        provenanceEntityIds: new Set([anchor, other]),
        sourceSha256: sha256,
        targetSha256: sha256,
      });
      if (result) return result;
    }
  }

  const strongConfirmedReferences = workspace.references.filter(
    (item) =>
      item.confirmationStatus === "CONFIRMED" &&
      STRONG_REFERENCE_TYPES.has(item.referenceType as RelationMatchKey),
  );
  if (
    strongConfirmedReferences.some(
      (item) =>
        !isUsableExactReferenceValue(item.normalizedValue) ||
        !isUsableExactReferenceValue(item.issuer),
    )
  ) {
    return reviewRequired("INVALID_CONFIRMED_REFERENCE");
  }
  const confirmedReferences = strongConfirmedReferences;
  const referencesByExactKey = new Map<string, ExternalReference[]>();
  for (const reference of confirmedReferences) {
    const document = documentsById.get(reference.documentId);
    if (!document) continue;
    const exactKey = JSON.stringify([
      document.authorityId,
      reference.referenceType,
      reference.issuer,
      reference.normalizedValue,
    ]);
    const group = referencesByExactKey.get(exactKey) ?? [];
    group.push(reference);
    referencesByExactKey.set(exactKey, group);
  }
  for (const group of referencesByExactKey.values()) {
    const documentIds = [...new Set(group.map((item) => item.documentId))].sort();
    if (documentIds.length < 2) continue;
    if (documentIds.length > 2) {
      if (documentIds.some((id) => selectedDocumentIds.has(id))) {
        return reviewRequired("AMBIGUOUS_EXPLICIT_REFERENCE");
      }
      continue;
    }
    const [sourceId, targetId] = documentIds as [string, string];
    if (!selectedDocumentIds.has(sourceId) && !selectedDocumentIds.has(targetId)) {
      continue;
    }
    const pairKey = canonicalPairKey("DOCUMENT", sourceId, targetId);
    if (existingDocumentPairs.has(pairKey)) continue;
    const referencesForPair = group.filter(
      (item) => item.documentId === sourceId || item.documentId === targetId,
    );
    const matchingKeys = new Set<RelationMatchKey>(
      referencesForPair.map((item) => item.referenceType as RelationMatchKey),
    );
    const provenanceEntityIds = new Set<string>();
    for (const reference of referencesForPair) {
      provenanceEntityIds.add(reference.id);
      for (const occurrenceId of reference.occurrenceIds) {
        provenanceEntityIds.add(occurrenceId);
      }
    }
    if (
      provenanceEntityIds.size >
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxEvidenceIds
    ) {
      return reviewRequired("PROVENANCE_LIMIT_EXCEEDED");
    }
    const result = addCandidate(pairKey, {
      kind: "DOCUMENT_REFERENCE",
      sourceId,
      targetId,
      matchingKeys,
      provenanceEntityIds,
    });
    if (result) return result;
  }

  const evaluated = [...candidates.values()]
    .sort((left, right) => {
      const leftKey = `${left.kind}:${left.sourceId}:${left.targetId}`;
      const rightKey = `${right.kind}:${right.sourceId}:${right.targetId}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    })
    .map((candidate) =>
      evaluateEntityRelation({
        ownerScope: input.ownerScope,
        source: {
          id: candidate.sourceId,
          ownerScope: input.ownerScope,
          entityType: candidate.kind === "FILE_EXACT" ? "FILE" : "DOCUMENT",
        },
        target: {
          id: candidate.targetId,
          ownerScope: input.ownerScope,
          entityType: candidate.kind === "FILE_EXACT" ? "FILE" : "DOCUMENT",
        },
        relationType:
          candidate.kind === "FILE_EXACT"
            ? "EXACT_FILE_DUPLICATE"
            : "POSSIBLY_RELATED",
        basis:
          candidate.kind === "FILE_EXACT"
            ? "EXACT_FILE_HASH"
            : "EXPLICIT_REFERENCE",
        matchingKeys: [...candidate.matchingKeys].sort(),
        provenanceEntityIds: [...candidate.provenanceEntityIds].sort(),
        algorithm: {
          id: FISCAL_RELATION_ENGINE_ID,
          version: FISCAL_RELATION_ENGINE_VERSION,
        },
        createdAt: input.createdAt,
        ...(candidate.kind === "FILE_EXACT"
          ? {
              exactIdentity: {
                sourceSha256: candidate.sourceSha256!,
                targetSha256: candidate.targetSha256!,
                sourceImmutableOriginal: true as const,
                targetImmutableOriginal: true as const,
              },
            }
          : {}),
      }),
    );
  const frozenCandidates = Object.freeze([...evaluated]);
  if (evaluated.length === 0) return informationPending();
  return Object.freeze({
    status: "COMPLETE",
    requiresHumanReview: evaluated.some((item) => item.requiresHumanReview),
    candidates: frozenCandidates,
  });
}

function parseInput(
  value: WorkspaceRelationProposalInput,
): WorkspaceRelationProposalInput {
  const input = snapshotExactDataObject(value, INPUT_KEYS);
  if (!input) throw invalidInput();
  assertBoundedOwnerScope(input.ownerScope, "ownerScope");
  if (!input.workspace || typeof input.workspace !== "object") {
    throw invalidInput();
  }
  const documentIds = snapshotIdArray(
    input.documentIds,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems,
  );
  if (!documentIds || documentIds.length === 0) throw invalidInput();
  for (let index = 0; index < documentIds.length; index += 1) {
    const documentId = documentIds[index];
    assertBoundedId(documentId, `documentIds[${index}]`);
  }
  if (new Set(documentIds).size !== documentIds.length) throw invalidInput();
  const createdAt = assertIsoTimestamp(input.createdAt);
  return {
    ownerScope: input.ownerScope,
    workspace: input.workspace as FiscalNotificationsWorkspace,
    documentIds,
    createdAt,
  };
}

function cloneValidatedWorkspace(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
): FiscalNotificationsWorkspace {
  validateWorkspace(workspace, ownerScope);
  if (!hasOnlyEnumerableDataProperties(workspace)) throw invalidInput();
  let clone: FiscalNotificationsWorkspace;
  try {
    clone = structuredClone(workspace);
  } catch {
    throw invalidInput();
  }
  validateWorkspace(clone, ownerScope);
  return clone;
}

function validateWorkspace(
  workspace: FiscalNotificationsWorkspace,
  ownerScope: string,
): void {
  const result = validateFiscalNotificationsWorkspaceIntegrity(
    workspace,
    ownerScope,
  );
  if (!result.valid) {
    if (result.issues.some((issue) => issue.code === "OWNER_SCOPE_MISMATCH")) {
      throw new Error("FISCAL_NOTIFICATIONS_OWNER_SCOPE_MISMATCH");
    }
    throw new Error("FISCAL_NOTIFICATIONS_INVALID_WORKSPACE");
  }
}

function hasOnlyEnumerableDataProperties(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const visited = new WeakSet<object>();
  const pending: object[] = [value];
  const maxProperties =
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxWorkspaceEntities * 64;
  let inspected = 0;
  try {
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const key of Reflect.ownKeys(current)) {
        if (Array.isArray(current) && key === "length") continue;
        if (typeof key !== "string") return false;
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
          return false;
        }
        inspected += 1;
        if (inspected > maxProperties) return false;
        if (descriptor.value && typeof descriptor.value === "object") {
          pending.push(descriptor.value);
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function snapshotExactDataObject(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const allowed = new Set(allowedKeys);
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result[key] = descriptor.value;
    }
    if (Object.keys(result).length !== allowedKeys.length) return null;
    return result;
  } catch {
    return null;
  }
}

function snapshotIdArray(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const result: string[] = [];
  try {
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        typeof descriptor.value !== "string"
      ) {
        return null;
      }
      result.push(descriptor.value);
    }
    if (Reflect.ownKeys(value).length !== value.length + 1) return null;
    return result;
  } catch {
    return null;
  }
}

function canonicalPairKey(
  kind: "FILE" | "DOCUMENT",
  left: string,
  right: string,
): string {
  return JSON.stringify(
    left < right ? [kind, left, right] : [kind, right, left],
  );
}

function isUsableExactReferenceValue(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars &&
    value === value.trim() &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}

function assertIsoTimestamp(value: unknown): string {
  if (typeof value !== "string") throw invalidInput();
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw invalidInput();
  }
  return value;
}

function reviewRequired(
  reason: Extract<
    WorkspaceRelationProposalResult,
    { status: "REVIEW_REQUIRED" }
  >["reason"],
): WorkspaceRelationProposalResult {
  const candidates = Object.freeze([]) as readonly [];
  return Object.freeze({
    status: "REVIEW_REQUIRED",
    requiresHumanReview: true,
    reason,
    candidates,
  });
}

function informationPending(): WorkspaceRelationProposalResult {
  const candidates = Object.freeze([]) as readonly [];
  return Object.freeze({
    status: "INFORMATION_PENDING",
    requiresHumanReview: true,
    reason: "NO_SUPPORTED_CONFIRMED_SIGNAL",
    candidates,
  });
}

function invalidInput(): Error {
  return new Error("FISCAL_NOTIFICATIONS_INVALID_RELATION_INPUT");
}
