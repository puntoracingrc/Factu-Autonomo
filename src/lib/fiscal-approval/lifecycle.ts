import type {
  FiscalIssueStatus,
  FiscalResolutionStatus,
  FiscalReviewStatus,
  TaxRule,
} from "@/lib/tax-model-diagnostic/contracts";
import type {
  FiscalReviewRegistry,
  FiscalRuleReviewDecision,
  FiscalSourceSnapshotRegistry,
} from "@/lib/fiscal-source-review/contracts";
import {
  computeSourceRegistryHash,
  sourceRecordMap,
} from "@/lib/fiscal-source-review/core";
import { evaluateDualFiscalReview } from "@/lib/fiscal-source-review/review";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";

import type {
  FiscalApprovalHistoryEntry,
  FiscalApprovalIssueRegistrySnapshot,
  FiscalApprovalInvalidationReason,
  FiscalApprovalSignatureEvidence,
  FiscalIssueTransition,
  FiscalRuleApprovalProjection,
  FiscalRuleMaterialSnapshot,
} from "./contracts";
import {
  FISCAL_APPROVAL_CONTRACT_VERSION,
  FISCAL_ISSUE_REGISTRY_CONTRACT_VERSION,
} from "./contracts";
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

function sourceById(snapshot: FiscalRuleMaterialSnapshot) {
  return new Map(
    snapshot.materialSources.map((source) => [source.sourceId, source]),
  );
}

function canonicalIssueRegistry(input: {
  ruleId: string;
  fiscalHash: string;
  registryComplete: boolean;
  issues: FiscalApprovalIssueRegistrySnapshot["issues"];
}): string {
  return JSON.stringify({
    contractVersion: FISCAL_ISSUE_REGISTRY_CONTRACT_VERSION,
    ruleId: input.ruleId,
    fiscalHash: input.fiscalHash,
    registryComplete: input.registryComplete,
    issues: [...input.issues]
      .map((issue) => ({
        issueId: issue.issueId,
        status: issue.status,
        evidenceReferences: sorted(issue.evidenceReferences),
        verifiedBy: issue.verifiedBy,
      }))
      .sort((left, right) => compareText(left.issueId, right.issueId)),
  });
}

export function buildFiscalApprovalIssueRegistry(input: {
  ruleId: string;
  fiscalHash: string;
  registryComplete: boolean;
  issues: FiscalApprovalIssueRegistrySnapshot["issues"];
}): FiscalApprovalIssueRegistrySnapshot {
  const issues = input.issues.map((issue) =>
    Object.freeze({
      ...issue,
      evidenceReferences: Object.freeze(sorted(issue.evidenceReferences)),
    }),
  );
  return Object.freeze({
    contractVersion: FISCAL_ISSUE_REGISTRY_CONTRACT_VERSION,
    ruleId: input.ruleId,
    fiscalHash: input.fiscalHash,
    registryComplete: input.registryComplete,
    issues: Object.freeze(issues),
    registryHash: `sha256:${sha256Hex(
      canonicalIssueRegistry({ ...input, issues }),
    )}`,
  });
}

function issueRegistryErrors(
  registry: FiscalApprovalIssueRegistrySnapshot,
  snapshot: FiscalRuleMaterialSnapshot,
  rule: TaxRule,
): string[] {
  const errors: string[] = [];
  const expectedHash = `sha256:${sha256Hex(canonicalIssueRegistry(registry))}`;
  if (registry.contractVersion !== FISCAL_ISSUE_REGISTRY_CONTRACT_VERSION) {
    errors.push("ISSUE_REGISTRY_CONTRACT_INVALID");
  }
  if (!registry.registryComplete) errors.push("ISSUE_REGISTRY_INCOMPLETE");
  if (registry.ruleId !== snapshot.ruleId) {
    errors.push("ISSUE_REGISTRY_RULE_ID_MISMATCH");
  }
  if (registry.fiscalHash !== snapshot.fiscalHash) {
    errors.push("ISSUE_REGISTRY_FISCAL_HASH_MISMATCH");
  }
  if (registry.registryHash !== expectedHash) {
    errors.push("ISSUE_REGISTRY_HASH_MISMATCH");
  }
  const duplicateIds = registry.issues.filter(
    (issue, index, entries) =>
      entries.findIndex((candidate) => candidate.issueId === issue.issueId) !==
      index,
  );
  if (duplicateIds.length > 0) errors.push("ISSUE_REGISTRY_DUPLICATE_IDS");
  const canonicalIssueIds = rule.fiscalMetadata.review.issueIds;
  const registryIssueIds = registry.issues.map((issue) => issue.issueId);
  if (
    new Set(canonicalIssueIds).size !== canonicalIssueIds.length ||
    !sameStrings(canonicalIssueIds, registryIssueIds)
  ) {
    errors.push("ISSUE_REGISTRY_CANONICAL_SET_MISMATCH");
  }
  for (const issue of registry.issues) {
    if (issue.status !== "VERIFIED") {
      errors.push(`${issue.issueId}:ISSUE_NOT_VERIFIED`);
    }
    if (!issue.verifiedBy?.trim() || issue.evidenceReferences.length === 0) {
      errors.push(`${issue.issueId}:ISSUE_VERIFICATION_EVIDENCE_REQUIRED`);
    }
  }
  return errors;
}

function assertProjectionMatchesSnapshot(
  projection: FiscalRuleApprovalProjection,
  snapshot: FiscalRuleMaterialSnapshot,
): void {
  if (projection.ruleId !== snapshot.ruleId) {
    throw new Error("FISCAL_APPROVAL_RULE_ID_MISMATCH");
  }
}

function assertCurrentMaterialSnapshot(
  snapshot: FiscalRuleMaterialSnapshot,
): void {
  if (snapshot.materialSources.length === 0) {
    throw new Error("FISCAL_MATERIAL_SOURCES_REQUIRED");
  }
  if (
    new Set(snapshot.materialSources.map((source) => source.sourceId)).size !==
    snapshot.materialSources.length
  ) {
    throw new Error("FISCAL_MATERIAL_SOURCE_IDS_MUST_BE_UNIQUE");
  }
  if (snapshot.fiscalHash !== computeFiscalApprovalRuleHash(snapshot)) {
    throw new Error("FISCAL_SNAPSHOT_HASH_MISMATCH");
  }
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
  const previousSources = sourceById(previous);
  for (const source of current.materialSources) {
    const previousSource = previousSources.get(source.sourceId);
    if (!previousSource) continue;
    if (
      previousSource.verificationStatus ===
        "VERIFIED_BY_TWO_FISCAL_REVIEWERS" &&
      source.verificationStatus !== "VERIFIED_BY_TWO_FISCAL_REVIEWERS"
    ) {
      reasons.push("SOURCE_VERIFICATION_DOWNGRADED");
    }
    if (
      previousSource.materialValidityStatus === "VERIFIED" &&
      (source.materialValidityStatus !== "VERIFIED" ||
        source.materialValidityBasis !== "SIGNED_FISCAL_REVIEW")
    ) {
      reasons.push("MATERIAL_VALIDITY_DOWNGRADED");
    }
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
  return Object.freeze([...new Set(reasons)]);
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
  assertProjectionMatchesSnapshot(input.projection, input.snapshot);
  assertCurrentMaterialSnapshot(input.snapshot);
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
  assertProjectionMatchesSnapshot(input.projection, input.snapshot);
  assertCurrentMaterialSnapshot(input.snapshot);
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

function approvalSourceErrors(input: {
  rule: TaxRule;
  snapshot: FiscalRuleMaterialSnapshot;
  sourceRegistry: FiscalSourceSnapshotRegistry;
}): string[] {
  const errors: string[] = [];
  const unsignedRegistry: Omit<FiscalSourceSnapshotRegistry, "registryHash"> = {
    contractVersion: input.sourceRegistry.contractVersion,
    generatedAt: input.sourceRegistry.generatedAt,
    sourceCount: input.sourceRegistry.sourceCount,
    sources: input.sourceRegistry.sources,
  };
  if (
    computeSourceRegistryHash(unsignedRegistry) !==
    input.sourceRegistry.registryHash
  ) {
    errors.push("SOURCE_REGISTRY_HASH_MISMATCH");
  }
  if (input.rule.ruleId !== input.snapshot.ruleId) {
    errors.push("TAX_RULE_SNAPSHOT_ID_MISMATCH");
  }
  if (!sameStrings(input.rule.officialSourceIds, sourceSet(input.snapshot))) {
    errors.push("TAX_RULE_SOURCE_SET_MISMATCH");
  }
  const currentSources = sourceRecordMap(input.sourceRegistry);
  for (const materialSource of input.snapshot.materialSources) {
    const current = currentSources.get(materialSource.sourceId);
    if (!current) {
      errors.push(`${materialSource.sourceId}:SOURCE_SNAPSHOT_MISSING`);
      continue;
    }
    if (
      current.contentHash !== materialSource.contentHash ||
      current.normalizedContentHash !== materialSource.normalizedContentHash
    ) {
      errors.push(`${materialSource.sourceId}:SOURCE_SNAPSHOT_HASH_MISMATCH`);
    }
    if (
      current.verificationStatus !==
        "VERIFIED_BY_TWO_FISCAL_REVIEWERS" ||
      current.materialValidity.status !== "VERIFIED" ||
      current.materialValidity.basis !== "SIGNED_FISCAL_REVIEW"
    ) {
      errors.push(`${materialSource.sourceId}:SOURCE_SNAPSHOT_NOT_VERIFIED`);
    }
  }
  return errors;
}

function signatureFromValidatedDecision(
  decision: FiscalRuleReviewDecision,
  snapshot: FiscalRuleMaterialSnapshot,
): FiscalApprovalSignatureEvidence {
  return Object.freeze({
    decisionId: decision.decisionId,
    reviewerId: decision.reviewerId,
    reviewerRole: decision.reviewerRole as
      | "PRIMARY_FISCAL_REVIEWER"
      | "SECOND_FISCAL_REVIEWER",
    reviewedRuleHash: decision.reviewedRuleHash,
    reviewedSourceHashes: Object.freeze(
      snapshot.materialSources.map((source) => Object.freeze({ ...source })),
    ),
    signatureReference: decision.signatureReference,
    evidenceReferences: Object.freeze(
      sorted([decision.signatureReference, ...decision.incidentIds]),
    ),
    signedAt: decision.recordedAt,
    revokedAt: null,
    revocationReason: null,
  });
}

export function approveFiscalRuleProjection(input: {
  projection: FiscalRuleApprovalProjection;
  snapshot: FiscalRuleMaterialSnapshot;
  rule: TaxRule;
  sourceRegistry: FiscalSourceSnapshotRegistry;
  reviewRegistry: FiscalReviewRegistry;
  issueRegistry: FiscalApprovalIssueRegistrySnapshot;
  occurredAt: string;
  eventId: string;
}): FiscalRuleApprovalProjection {
  assertProjectionMatchesSnapshot(input.projection, input.snapshot);
  assertCurrentMaterialSnapshot(input.snapshot);
  if (input.projection.reviewStatus !== "IN_REVIEW") {
    throw new Error("RULE_MUST_BE_IN_REVIEW");
  }
  if (input.projection.reviewedFiscalHash !== input.snapshot.fiscalHash) {
    throw new Error("FISCAL_APPROVAL_REVIEW_SNAPSHOT_MISMATCH");
  }
  const sourceErrors = approvalSourceErrors(input);
  const evaluation = evaluateDualFiscalReview(
    input.rule,
    input.sourceRegistry,
    input.reviewRegistry,
    input.snapshot.fiscalHash,
  );
  if (evaluation.state !== "ELIGIBLE_FOR_MANUAL_APPROVAL") {
    sourceErrors.push(`DUAL_FISCAL_REVIEW_${evaluation.state}`);
  }
  sourceErrors.push(...evaluation.blockingReasons);
  const validDecisionIds = new Set(evaluation.validDecisionIds);
  const validatedDecisions = input.reviewRegistry.decisions.filter(
    (decision) =>
      validDecisionIds.has(decision.decisionId) &&
      (decision.reviewerRole === "PRIMARY_FISCAL_REVIEWER" ||
        decision.reviewerRole === "SECOND_FISCAL_REVIEWER"),
  );
  const signatures = validatedDecisions.map((decision) =>
    signatureFromValidatedDecision(decision, input.snapshot),
  );
  const errors = [
    ...sourceErrors,
    ...activeSignatureErrors(input.snapshot, signatures),
    ...issueRegistryErrors(input.issueRegistry, input.snapshot, input.rule),
  ];
  const evidenceReferences = sorted([
    ...signatures.map((signature) => signature.signatureReference),
    ...input.issueRegistry.issues.flatMap(
      (issue) => issue.evidenceReferences,
    ),
  ]);
  if (evidenceReferences.length === 0) {
    errors.push("APPROVAL_EVIDENCE_REQUIRED");
  }
  if (errors.length > 0) {
    throw new Error(`FISCAL_APPROVAL_BLOCKED:${errors.sort(compareText).join(",")}`);
  }
  const primary = signatures.find(
    (signature) => signature.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
  )!;
  const second = signatures.find(
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
    signatures: Object.freeze(signatures),
    evidenceReferences: Object.freeze(evidenceReferences),
    invalidatedAt: null,
    invalidationReasons: Object.freeze([]),
    history: Object.freeze([...input.projection.history, historyEntry]),
  });
}

export function invalidateFiscalApproval(input: {
  projection: FiscalRuleApprovalProjection;
  previous: FiscalRuleMaterialSnapshot;
  current: FiscalRuleMaterialSnapshot;
  rule: TaxRule;
  sourceRegistry: FiscalSourceSnapshotRegistry;
  currentReviewRegistry: FiscalReviewRegistry;
  occurredAt: string;
  eventId: string;
}): FiscalRuleApprovalProjection {
  assertProjectionMatchesSnapshot(input.projection, input.previous);
  assertProjectionMatchesSnapshot(input.projection, input.current);
  assertCurrentMaterialSnapshot(input.previous);
  assertCurrentMaterialSnapshot(input.current);
  const reasons = [...detectFiscalApprovalInvalidation(
    input.previous,
    input.current,
  )];
  const requiredReviewDecisionIds = [
    input.projection.primaryDecisionId,
    input.projection.secondDecisionId,
  ].filter((decisionId): decisionId is string => decisionId !== null);
  const currentEvaluation = evaluateDualFiscalReview(
    input.rule,
    input.sourceRegistry,
    input.currentReviewRegistry,
    input.current.fiscalHash,
  );
  const currentActiveReviewDecisionIds = currentEvaluation.validDecisionIds;
  if (
    (requiredReviewDecisionIds.length > 0 &&
      currentEvaluation.state !== "ELIGIBLE_FOR_MANUAL_APPROVAL") ||
    requiredReviewDecisionIds.some(
      (decisionId) => !currentActiveReviewDecisionIds.includes(decisionId),
    ) ||
    input.projection.signatures.some(
      (signature) => signature.revokedAt !== null,
    )
  ) {
    reasons.push("FISCAL_REVIEW_REVOKED");
  }
  if (
    requiredReviewDecisionIds.length > 0 &&
    approvalSourceErrors({
      rule: input.rule,
      snapshot: input.current,
      sourceRegistry: input.sourceRegistry,
    }).length > 0
  ) {
    reasons.push("SOURCE_VERIFICATION_DOWNGRADED");
  }
  if (reasons.length === 0) return input.projection;

  const uniqueReasons = Object.freeze([...new Set(reasons)]);

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
    reasonCodes: uniqueReasons,
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
    invalidationReasons: uniqueReasons,
    history: Object.freeze([...input.projection.history, historyEntry]),
  });
}
