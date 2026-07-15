import type { TaxRule } from "@/lib/tax-model-diagnostic/contracts";

import type {
  CompactFiscalReviewView,
  FiscalDualReviewEvaluation,
  FiscalReviewRegistry,
  FiscalRuleReviewRecord,
  FiscalSourceSnapshotRegistry,
} from "./contracts";
import { sourceRecordMap } from "./core";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function currentReviewErrors(
  record: FiscalRuleReviewRecord,
  rule: TaxRule,
  sourceRegistry: FiscalSourceSnapshotRegistry,
): string[] {
  const errors: string[] = [];
  if (record.origin !== "HUMAN_SIGNED_FISCAL_REVIEW") {
    errors.push("AUTOMATED_REVIEW_FORBIDDEN");
  }
  if (!record.signatureReference.trim()) errors.push("MISSING_SIGNATURE_REFERENCE");
  if (
    record.decision === "APPROVE" &&
    record.findings.some((finding) => finding.severity === "BLOCKING")
  ) {
    errors.push("APPROVE_WITH_BLOCKING_FINDINGS");
  }
  if (record.reviewedRuleHash !== rule.fiscalMetadata.ruleHash) {
    errors.push("STALE_RULE_HASH");
  }
  const sourceById = sourceRecordMap(sourceRegistry);
  const expectedSourceIds = [...rule.officialSourceIds].sort(compareText);
  const reviewedSourceIds = record.reviewedSourceHashes
    .map((source) => source.sourceId)
    .sort(compareText);
  if (JSON.stringify(expectedSourceIds) !== JSON.stringify(reviewedSourceIds)) {
    errors.push("INCOMPLETE_SOURCE_SET");
  }
  for (const source of record.reviewedSourceHashes) {
    if (sourceById.get(source.sourceId)?.snapshotHash !== source.snapshotHash) {
      errors.push(`STALE_SOURCE_HASH:${source.sourceId}`);
    }
  }
  return errors;
}

export function evaluateDualFiscalReview(
  rule: TaxRule,
  sourceRegistry: FiscalSourceSnapshotRegistry,
  reviewRegistry: FiscalReviewRegistry,
): FiscalDualReviewEvaluation {
  const records = reviewRegistry.records.filter(
    (record) => record.ruleId === rule.ruleId,
  );
  const invalid = records.filter(
    (record) => currentReviewErrors(record, rule, sourceRegistry).length > 0,
  );
  const valid = records.filter(
    (record) => currentReviewErrors(record, rule, sourceRegistry).length === 0,
  );
  const blockingReasons = invalid.flatMap((record) =>
    currentReviewErrors(record, rule, sourceRegistry).map(
      (error) => `${record.reviewId}:${error}`,
    ),
  );
  const primaryRecords = valid.filter(
    (record) => record.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
  );
  const secondRecords = valid.filter(
    (record) => record.reviewerRole === "SECOND_FISCAL_REVIEWER",
  );
  const primary = primaryRecords[0];
  const second = secondRecords[0];
  const hasStaleReview = blockingReasons.some(
    (reason) =>
      reason.includes(":STALE_RULE_HASH") ||
      reason.includes(":STALE_SOURCE_HASH:"),
  );

  let state: FiscalDualReviewEvaluation["state"];
  if (invalid.length > 0) {
    state = hasStaleReview ? "STALE_REVIEW" : "INVALID_REVIEW";
  }
  else if (primaryRecords.length > 1 || secondRecords.length > 1) {
    state = "INVALID_REVIEW";
    if (primaryRecords.length > 1) blockingReasons.push("MULTIPLE_PRIMARY_REVIEWS");
    if (secondRecords.length > 1) blockingReasons.push("MULTIPLE_SECOND_REVIEWS");
  }
  else if (!primary) state = "WAITING_PRIMARY_REVIEW";
  else if (!second) state = "WAITING_SECOND_REVIEW";
  else if (primary.reviewerId === second.reviewerId) {
    state = "INVALID_REVIEW";
    blockingReasons.push("SAME_REVIEWER_FOR_BOTH_ROLES");
  } else if (primary.decision === "REJECT" || second.decision === "REJECT") {
    state = "REJECTED";
  } else if (
    primary.decision === "REQUEST_CHANGES" ||
    second.decision === "REQUEST_CHANGES"
  ) {
    state = "CHANGES_REQUESTED";
  } else {
    state = "ELIGIBLE_FOR_MANUAL_APPROVAL";
  }

  return {
    ruleId: rule.ruleId,
    state,
    validReviewIds: valid.map((record) => record.reviewId).sort(compareText),
    invalidReviewIds: invalid.map((record) => record.reviewId).sort(compareText),
    blockingReasons: [...new Set(blockingReasons)].sort(compareText),
    changesRuleReviewStatus: false,
    sourceStatus: "UNVERIFIED",
  };
}

export function buildCompactFiscalReviewView(
  rule: TaxRule,
  sourceRegistry: FiscalSourceSnapshotRegistry,
  reviewRegistry: FiscalReviewRegistry,
): CompactFiscalReviewView {
  const sourceById = sourceRecordMap(sourceRegistry);
  const evaluation = evaluateDualFiscalReview(
    rule,
    sourceRegistry,
    reviewRegistry,
  );
  const incidents = reviewRegistry.records
    .filter((record) => record.ruleId === rule.ruleId)
    .flatMap((record) => record.incidentIds);

  return {
    ruleId: rule.ruleId,
    model: rule.modelNumber,
    fiscalYear: rule.fiscalYear,
    conditions: rule.conditions,
    exceptions: rule.exclusions,
    testIds: rule.tests,
    sources: rule.officialSourceIds.map((sourceId) => {
      const source = sourceById.get(sourceId);
      if (!source) throw new Error(`MISSING_SOURCE_SNAPSHOT:${sourceId}`);
      return {
        sourceId,
        title: source.title,
        materialScope: source.materialScope,
        snapshotHash: source.snapshotHash,
        verificationStatus: source.verificationStatus,
      };
    }),
    incidents: [...new Set(incidents)].sort(compareText),
    hashes: {
      ruleHash: rule.fiscalMetadata.ruleHash,
      sourceHashes: rule.officialSourceIds.map(
        (sourceId) => sourceById.get(sourceId)?.snapshotHash ?? "MISSING",
      ),
    },
    reviewState: evaluation.state,
    availableDecisions: ["APPROVE", "REJECT", "REQUEST_CHANGES"],
    automaticApproval: false,
  };
}
