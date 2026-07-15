import type {
  FiscalIssueStatus,
  FiscalResolutionStatus,
  FiscalReviewStatus,
} from "@/lib/tax-model-diagnostic/contracts";

import type {
  FiscalApprovalHistoryEntry,
  FiscalApprovalInvalidationReason,
  FiscalApprovalSignatureEvidence,
  FiscalIssueTransition,
  FiscalRuleApprovalProjection,
  FiscalRuleMaterialSnapshot,
} from "./contracts";
import { FISCAL_APPROVAL_CONTRACT_VERSION } from "./contracts";
import { computeFiscalApprovalRuleHash } from "./canonical-hash";

const RULE_TRANSITIONS: Readonly<
  Record<FiscalReviewStatus, readonly FiscalReviewStatus[]>
> = Object.freeze({
  PENDING_FISCAL_REVIEW: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
});

const ISSUE_TRANSITIONS: Readonly<
  Partial<Record<FiscalIssueStatus, readonly FiscalIssueStatus[]>>
> = Object.freeze({
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["READY_FOR_VERIFICATION"],
  READY_FOR_VERIFICATION: ["VERIFIED"],
  VERIFIED: [],
  REOPENED: ["IN_PROGRESS"],
});

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort(compareText);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function sourceSet(snapshot: FiscalRuleMaterialSnapshot): readonly string[] {
  return snapshot.materialSources.map((source) => source.sourceId);
}

function sourceHashes(snapshot: FiscalRuleMaterialSnapshot): readonly string[] {
  return snapshot.materialSources.map(
    (source) =>
      `${source.sourceId}:${source.contentHash}:${source.normalizedContentHash}`,
  );
}

export function transitionFiscalRuleReviewStatus(
  current: FiscalReviewStatus,
  next: FiscalReviewStatus,
): FiscalReviewStatus {
  if (!RULE_TRANSITIONS[current].includes(next)) {
    throw new Error(`INVALID_FISCAL_RULE_TRANSITION:${current}->${next}`);
  }
  return next;
}

export function transitionFiscalIssueStatus(input: {
  issueId: string;
  current: FiscalIssueStatus;
  next: FiscalIssueStatus;
  occurredAt: string;
  evidenceReferences?: readonly string[];
  verifiedBy?: string | null;
}): FiscalIssueTransition {
  if (!(ISSUE_TRANSITIONS[input.current] ?? []).includes(input.next)) {
    throw new Error(
      `INVALID_FISCAL_ISSUE_TRANSITION:${input.current}->${input.next}`,
    );
  }
  const evidenceReferences = sorted(input.evidenceReferences ?? []);
  if (
    input.next === "READY_FOR_VERIFICATION" &&
    evidenceReferences.length === 0
  ) {
    throw new Error("FISCAL_ISSUE_EVIDENCE_REQUIRED");
  }
  if (
    input.next === "VERIFIED" &&
    (!input.verifiedBy?.trim() || evidenceReferences.length === 0)
  ) {
    throw new Error("FISCAL_ISSUE_VERIFICATION_REQUIRED");
  }
  return Object.freeze({
    issueId: input.issueId,
    previousStatus: input.current,
    nextStatus: input.next,
    occurredAt: input.occurredAt,
    evidenceReferences: Object.freeze(evidenceReferences),
    verifiedBy: input.next === "VERIFIED" ? input.verifiedBy! : null,
  });
}

export function detectFiscalApprovalInvalidation(
  previous: FiscalRuleMaterialSnapshot,
  current: FiscalRuleMaterialSnapshot,
): readonly FiscalApprovalInvalidationReason[] {
  if (previous.ruleId !== current.ruleId) {
    throw new Error("FISCAL_RULE_ID_CHANGED");
  }
  const reasons: FiscalApprovalInvalidationReason[] = [];
  const previousComputedHash = computeFiscalApprovalRuleHash(previous);
  const currentComputedHash = computeFiscalApprovalRuleHash(current);
  if (
    previous.fiscalHash !== previousComputedHash ||
    current.fiscalHash !== currentComputedHash ||
    previousComputedHash !== currentComputedHash
  ) {
    reasons.push("FISCAL_HASH_CHANGED");
  }
  if (!sameStrings(previous.conditions, current.conditions)) {
    reasons.push("CONDITION_CHANGED");
  }
  if (!sameStrings(previous.exceptions, current.exceptions)) {
    reasons.push("EXCEPTION_CHANGED");
  }
  if (!sameStrings(sourceSet(previous), sourceSet(current))) {
    reasons.push("SOURCE_SET_CHANGED");
  } else if (!sameStrings(sourceHashes(previous), sourceHashes(current))) {
    reasons.push("SOURCE_HASH_CHANGED");
  }
  if (previous.fiscalYear !== current.fiscalYear) {
    reasons.push("FISCAL_YEAR_CHANGED");
  }
  if (previous.territory !== current.territory) {
    reasons.push("TERRITORY_CHANGED");
  }
  if (previous.materialTestHash !== current.materialTestHash) {
    reasons.push("MATERIAL_TEST_CHANGED");
  }
  return Object.freeze(reasons);
}

export function emptyFiscalApprovalProjection(
  ruleId: string,
): FiscalRuleApprovalProjection {
  return Object.freeze({
    contractVersion: FISCAL_APPROVAL_CONTRACT_VERSION,
    ruleId,
    reviewStatus: "PENDING_FISCAL_REVIEW",
    resolutionStatus: "OPEN",
    reviewedFiscalHash: null,
    primaryDecisionId: null,
    secondDecisionId: null,
    signatures: Object.freeze([]),
    evidenceReferences: Object.freeze([]),
    authorizedExclusionIds: Object.freeze([]),
    invalidatedAt: null,
    invalidationReasons: Object.freeze([]),
    history: Object.freeze([]),
  });
}

export function startFiscalRuleReview(input: {
  projection: FiscalRuleApprovalProjection;
  snapshot: FiscalRuleMaterialSnapshot;
  occurredAt: string;
  eventId: string;
}): FiscalRuleApprovalProjection {
  const nextReviewStatus = transitionFiscalRuleReviewStatus(
    input.projection.reviewStatus,
    "IN_REVIEW",
  );
  const historyEntry: FiscalApprovalHistoryEntry = Object.freeze({
    eventId: input.eventId,
    eventType: "REVIEW_STARTED",
    occurredAt: input.occurredAt,
    previousReviewStatus: input.projection.reviewStatus,
    nextReviewStatus,
    previousResolutionStatus: input.projection.resolutionStatus,
    nextResolutionStatus: "IN_PROGRESS",
    fiscalHash: input.snapshot.fiscalHash,
    reasonCodes: Object.freeze([]),
    decisionIds: Object.freeze([]),
  });
  return Object.freeze({
    ...input.projection,
    reviewStatus: nextReviewStatus,
    resolutionStatus: "IN_PROGRESS",
    reviewedFiscalHash: input.snapshot.fiscalHash,
    history: Object.freeze([...input.projection.history, historyEntry]),
  });
}

export function rejectFiscalRuleProjection(input: {
  projection: FiscalRuleApprovalProjection;
  snapshot: FiscalRuleMaterialSnapshot;
  occurredAt: string;
  eventId: string;
  reasonCodes: readonly string[];
  decisionIds: readonly string[];
}): FiscalRuleApprovalProjection {
  if (input.reasonCodes.length === 0 || input.decisionIds.length === 0) {
    throw new Error("REJECTION_EVIDENCE_REQUIRED");
  }
  const nextReviewStatus = transitionFiscalRuleReviewStatus(
    input.projection.reviewStatus,
    "REJECTED",
  );
  const historyEntry: FiscalApprovalHistoryEntry = Object.freeze({
    eventId: input.eventId,
    eventType: "RULE_REJECTED",
    occurredAt: input.occurredAt,
    previousReviewStatus: input.projection.reviewStatus,
    nextReviewStatus,
    previousResolutionStatus: input.projection.resolutionStatus,
    nextResolutionStatus: "OPEN",
    fiscalHash: input.snapshot.fiscalHash,
    reasonCodes: Object.freeze(sorted(input.reasonCodes)),
    decisionIds: Object.freeze(sorted(input.decisionIds)),
  });
  return Object.freeze({
    ...input.projection,
    reviewStatus: nextReviewStatus,
    resolutionStatus: "OPEN",
    authorizedExclusionIds: Object.freeze([]),
    history: Object.freeze([...input.projection.history, historyEntry]),
  });
}

function activeSignatureErrors(
  snapshot: FiscalRuleMaterialSnapshot,
  signatures: readonly FiscalApprovalSignatureEvidence[],
): string[] {
  const errors: string[] = [];
  if (
    snapshot.materialSources.some(
      (source) =>
        source.verificationStatus !==
          "VERIFIED_BY_TWO_FISCAL_REVIEWERS" ||
        source.materialValidityStatus !== "VERIFIED" ||
        source.materialValidityBasis !== "SIGNED_FISCAL_REVIEW",
    )
  ) {
    errors.push("FISCAL_SOURCES_NOT_VERIFIED");
  }
  const active = signatures.filter((signature) => signature.revokedAt === null);
  const primary = active.filter(
    (signature) => signature.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
  );
  const second = active.filter(
    (signature) => signature.reviewerRole === "SECOND_FISCAL_REVIEWER",
  );
  if (primary.length !== 1) errors.push("ONE_PRIMARY_REVIEW_REQUIRED");
  if (second.length !== 1) errors.push("ONE_SECOND_REVIEW_REQUIRED");
  if (primary[0]?.reviewerId === second[0]?.reviewerId) {
    errors.push("DISTINCT_FISCAL_REVIEWERS_REQUIRED");
  }
  const expectedSourceHashes = sourceHashes(snapshot);
  for (const signature of active) {
    if (!signature.signatureReference.trim()) {
      errors.push(`${signature.decisionId}:SIGNATURE_REFERENCE_REQUIRED`);
    }
    if (signature.evidenceReferences.length === 0) {
      errors.push(`${signature.decisionId}:VERIFIED_EVIDENCE_REQUIRED`);
    }
    if (signature.reviewedRuleHash !== snapshot.fiscalHash) {
      errors.push(`${signature.decisionId}:STALE_FISCAL_HASH`);
    }
    const reviewedHashes = signature.reviewedSourceHashes.map(
      (source) =>
        `${source.sourceId}:${source.contentHash}:${source.normalizedContentHash}`,
    );
    if (!sameStrings(expectedSourceHashes, reviewedHashes)) {
      errors.push(`${signature.decisionId}:STALE_SOURCE_HASHES`);
    }
  }
  return [...new Set(errors)].sort(compareText);
}

export function approveFiscalRuleProjection(input: {
  projection: FiscalRuleApprovalProjection;
  snapshot: FiscalRuleMaterialSnapshot;
  signatures: readonly FiscalApprovalSignatureEvidence[];
  verifiedIssueIds: readonly string[];
  requiredIssueIds: readonly string[];
  evidenceReferences: readonly string[];
  occurredAt: string;
  eventId: string;
}): FiscalRuleApprovalProjection {
  if (input.projection.reviewStatus !== "IN_REVIEW") {
    throw new Error("RULE_MUST_BE_IN_REVIEW");
  }
  const errors = activeSignatureErrors(input.snapshot, input.signatures);
  if (
    input.snapshot.fiscalHash !==
    computeFiscalApprovalRuleHash(input.snapshot)
  ) {
    errors.push("FISCAL_SNAPSHOT_HASH_MISMATCH");
  }
  if (!sameStrings(input.verifiedIssueIds, input.requiredIssueIds)) {
    errors.push("ALL_FISCAL_ISSUES_MUST_BE_VERIFIED");
  }
  if (input.evidenceReferences.length === 0) {
    errors.push("APPROVAL_EVIDENCE_REQUIRED");
  }
  if (errors.length > 0) {
    throw new Error(`FISCAL_APPROVAL_BLOCKED:${errors.sort(compareText).join(",")}`);
  }
  const primary = input.signatures.find(
    (signature) => signature.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
  )!;
  const second = input.signatures.find(
    (signature) => signature.reviewerRole === "SECOND_FISCAL_REVIEWER",
  )!;
  const historyEntry: FiscalApprovalHistoryEntry = Object.freeze({
    eventId: input.eventId,
    eventType: "RULE_APPROVED",
    occurredAt: input.occurredAt,
    previousReviewStatus: input.projection.reviewStatus,
    nextReviewStatus: "APPROVED",
    previousResolutionStatus: input.projection.resolutionStatus,
    nextResolutionStatus: "RESOLVED",
    fiscalHash: input.snapshot.fiscalHash,
    reasonCodes: Object.freeze([]),
    decisionIds: Object.freeze([primary.decisionId, second.decisionId].sort()),
  });
  return Object.freeze({
    ...input.projection,
    reviewStatus: transitionFiscalRuleReviewStatus(
      input.projection.reviewStatus,
      "APPROVED",
    ),
    resolutionStatus: "RESOLVED",
    reviewedFiscalHash: input.snapshot.fiscalHash,
    primaryDecisionId: primary.decisionId,
    secondDecisionId: second.decisionId,
    signatures: Object.freeze([...input.signatures]),
    evidenceReferences: Object.freeze(sorted(input.evidenceReferences)),
    invalidatedAt: null,
    invalidationReasons: Object.freeze([]),
    history: Object.freeze([...input.projection.history, historyEntry]),
  });
}

export function invalidateFiscalApproval(input: {
  projection: FiscalRuleApprovalProjection;
  previous: FiscalRuleMaterialSnapshot;
  current: FiscalRuleMaterialSnapshot;
  occurredAt: string;
  eventId: string;
}): FiscalRuleApprovalProjection {
  const reasons = detectFiscalApprovalInvalidation(
    input.previous,
    input.current,
  );
  if (reasons.length === 0) return input.projection;

  const decisionIds = input.projection.signatures.map(
    (signature) => signature.decisionId,
  );
  const revokedSignatures = input.projection.signatures.map((signature) =>
    signature.revokedAt === null
      ? Object.freeze({
          ...signature,
          revokedAt: input.occurredAt,
          revocationReason: "MATERIAL_RULE_CHANGE",
        })
      : signature,
  );
  const historyEntry: FiscalApprovalHistoryEntry = Object.freeze({
    eventId: input.eventId,
    eventType: "APPROVAL_INVALIDATED",
    occurredAt: input.occurredAt,
    previousReviewStatus: input.projection.reviewStatus,
    nextReviewStatus: "PENDING_FISCAL_REVIEW",
    previousResolutionStatus: input.projection.resolutionStatus,
    nextResolutionStatus: "OPEN",
    fiscalHash: input.current.fiscalHash,
    reasonCodes: reasons,
    decisionIds: Object.freeze(sorted(decisionIds)),
  });

  return Object.freeze({
    ...input.projection,
    reviewStatus: "PENDING_FISCAL_REVIEW",
    resolutionStatus: "OPEN" as FiscalResolutionStatus,
    reviewedFiscalHash: null,
    primaryDecisionId: null,
    secondDecisionId: null,
    signatures: Object.freeze(revokedSignatures),
    evidenceReferences: Object.freeze([]),
    authorizedExclusionIds: Object.freeze([]),
    invalidatedAt: input.occurredAt,
    invalidationReasons: reasons,
    history: Object.freeze([...input.projection.history, historyEntry]),
  });
}
