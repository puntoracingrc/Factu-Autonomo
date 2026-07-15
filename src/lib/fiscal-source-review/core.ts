import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  FiscalReviewRegistry,
  FiscalRuleReviewRecord,
  FiscalSourceDiffEntry,
  FiscalSourceDiffReport,
  FiscalSourceSnapshotRecord,
  FiscalSourceSnapshotRegistry,
} from "./contracts";
import {
  FISCAL_REVIEW_REGISTRY_VERSION,
  FISCAL_SOURCE_REGISTRY_VERSION,
} from "./contracts";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort(compareText);
}

function sha256(value: string | Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function canonicalizeSourceRegistry(
  registry: Omit<FiscalSourceSnapshotRegistry, "registryHash">,
): string {
  return JSON.stringify({
    contractVersion: registry.contractVersion,
    generatedAt: registry.generatedAt,
    sourceCount: registry.sourceCount,
    sources: [...registry.sources]
      .map((source) => ({
        ...source,
        affectedRuleIds: sorted(source.affectedRuleIds),
      }))
      .sort((left, right) => compareText(left.sourceId, right.sourceId)),
  });
}

export function computeSourceRegistryHash(
  registry: Omit<FiscalSourceSnapshotRegistry, "registryHash">,
): `sha256:${string}` {
  return sha256(canonicalizeSourceRegistry(registry));
}

export function sourceRecordMap(
  registry: FiscalSourceSnapshotRegistry,
): ReadonlyMap<string, FiscalSourceSnapshotRecord> {
  return new Map(registry.sources.map((source) => [source.sourceId, source]));
}

export function diffFiscalSourceRegistries(
  baseline: FiscalSourceSnapshotRegistry,
  candidate: FiscalSourceSnapshotRegistry,
  reviewRegistry: FiscalReviewRegistry,
): FiscalSourceDiffReport {
  const baselineById = sourceRecordMap(baseline);
  const candidateById = sourceRecordMap(candidate);
  const changes: FiscalSourceDiffEntry[] = [];

  for (const source of candidate.sources) {
    const previous = baselineById.get(source.sourceId);
    if (!previous) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "NEW",
        changedFields: ["source"],
        affectedRuleIds: sorted(source.affectedRuleIds),
      });
      continue;
    }

    const changedFields = [
      "authority",
      "officialLocator",
      "finalOfficialLocator",
      "declaredOfficialUpdatedAt",
      "materialValidity",
      "snapshotHash",
      "contentLength",
      "contentType",
      "captureScope",
      "materialScope",
      "affectedRuleIds",
      "verificationStatus",
    ].filter(
      (field) =>
        JSON.stringify(previous[field as keyof FiscalSourceSnapshotRecord]) !==
        JSON.stringify(source[field as keyof FiscalSourceSnapshotRecord]),
    );

    if (changedFields.length > 0) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "MODIFIED",
        changedFields,
        affectedRuleIds: sorted([
          ...previous.affectedRuleIds,
          ...source.affectedRuleIds,
        ]),
      });
    }
  }

  for (const source of baseline.sources) {
    if (!candidateById.has(source.sourceId)) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "REMOVED",
        changedFields: ["source"],
        affectedRuleIds: sorted(source.affectedRuleIds),
      });
    }
  }

  changes.sort((left, right) => compareText(left.sourceId, right.sourceId));
  const affectedRuleIds = sorted(
    [...new Set(changes.flatMap((change) => change.affectedRuleIds))],
  );
  const affectedRuleSet = new Set(affectedRuleIds);
  const reviewIdsToInvalidate = sorted(
    reviewRegistry.records
      .filter((record) => affectedRuleSet.has(record.ruleId))
      .map((record) => record.reviewId),
  );
  const ruleApprovalsToInvalidate = sorted(
    [...
      new Set(
        reviewRegistry.records
          .filter(
            (record) =>
              record.decision === "APPROVE" &&
              affectedRuleSet.has(record.ruleId),
          )
          .map((record) => record.ruleId),
      ),
    ],
  );

  return {
    contractVersion: "fiscal-source-diff.v1",
    baselineRegistryHash: baseline.registryHash,
    candidateRegistryHash: candidate.registryHash,
    status: changes.length === 0 ? "CLEAN" : "CHANGED",
    changes,
    affectedRuleIds,
    reviewIdsToInvalidate,
    ruleApprovalsToInvalidate,
  };
}

export interface FiscalSourceValidationContext {
  rootDirectory: string;
  expectedSourceIds: readonly string[];
  expectedRuleSourceIds: ReadonlyMap<string, readonly string[]>;
  expectedRuleStates: readonly {
    ruleId: string;
    ruleHash: string;
    reviewStatus: string;
    resolutionStatus: string;
    exclusionAuthorized: boolean;
  }[];
}

function officialHostname(authority: string, locator: string): boolean {
  try {
    const hostname = new URL(locator).hostname.toLowerCase();
    if (authority === "BOE") return hostname === "www.boe.es" || hostname === "boe.es";
    if (authority === "AEAT") {
      return (
        hostname === "sede.agenciatributaria.gob.es" ||
        hostname.endsWith(".agenciatributaria.gob.es")
      );
    }
    if (authority === "SEGURIDAD_SOCIAL") {
      return hostname.endsWith("seg-social.es");
    }
    if (authority === "EU") return hostname.endsWith("europa.eu");
    return false;
  } catch {
    return false;
  }
}

function validateReviewRecord(
  record: FiscalRuleReviewRecord,
  rules: FiscalSourceValidationContext["expectedRuleStates"],
  sourceById: ReadonlyMap<string, FiscalSourceSnapshotRecord>,
  ruleSourceIds: ReadonlyMap<string, readonly string[]>,
): string[] {
  const errors: string[] = [];
  const rule = rules.find((candidate) => candidate.ruleId === record.ruleId);
  if (!rule) return [`${record.reviewId}:UNKNOWN_RULE`];
  if (
    record.reviewerRole !== "PRIMARY_FISCAL_REVIEWER" &&
    record.reviewerRole !== "SECOND_FISCAL_REVIEWER"
  ) {
    errors.push(`${record.reviewId}:INVALID_REVIEWER_ROLE`);
  }
  if (
    record.decision !== "APPROVE" &&
    record.decision !== "REJECT" &&
    record.decision !== "REQUEST_CHANGES"
  ) {
    errors.push(`${record.reviewId}:INVALID_REVIEW_DECISION`);
  }
  if (!record.reviewerId.trim()) {
    errors.push(`${record.reviewId}:MISSING_REVIEWER_ID`);
  }
  if (record.origin !== "HUMAN_SIGNED_FISCAL_REVIEW") {
    errors.push(`${record.reviewId}:AUTOMATED_REVIEW_FORBIDDEN`);
  }
  if (!record.signatureReference.trim()) {
    errors.push(`${record.reviewId}:MISSING_SIGNATURE_REFERENCE`);
  }
  if (
    record.decision === "APPROVE" &&
    record.findings.some((finding) => finding.severity === "BLOCKING")
  ) {
    errors.push(`${record.reviewId}:APPROVE_WITH_BLOCKING_FINDINGS`);
  }
  if (record.reviewedRuleHash !== rule.ruleHash) {
    errors.push(`${record.reviewId}:STALE_RULE_HASH`);
  }
  const expectedSources = sorted(ruleSourceIds.get(record.ruleId) ?? []);
  const reviewedSources = sorted(
    record.reviewedSourceHashes.map((source) => source.sourceId),
  );
  if (JSON.stringify(expectedSources) !== JSON.stringify(reviewedSources)) {
    errors.push(`${record.reviewId}:INCOMPLETE_SOURCE_SET`);
  }
  for (const reviewedSource of record.reviewedSourceHashes) {
    const current = sourceById.get(reviewedSource.sourceId);
    if (!current || current.snapshotHash !== reviewedSource.snapshotHash) {
      errors.push(`${record.reviewId}:STALE_SOURCE_HASH:${reviewedSource.sourceId}`);
    }
  }
  return errors;
}

export function validateFiscalSourceState(
  registry: FiscalSourceSnapshotRegistry,
  reviewRegistry: FiscalReviewRegistry,
  context: FiscalSourceValidationContext,
): string[] {
  const errors: string[] = [];
  if (registry.contractVersion !== FISCAL_SOURCE_REGISTRY_VERSION) {
    errors.push("INVALID_SOURCE_REGISTRY_VERSION");
  }
  if (reviewRegistry.contractVersion !== FISCAL_REVIEW_REGISTRY_VERSION) {
    errors.push("INVALID_REVIEW_REGISTRY_VERSION");
  }
  if (registry.sourceCount !== registry.sources.length) {
    errors.push("SOURCE_COUNT_MISMATCH");
  }
  const withoutHash: Omit<FiscalSourceSnapshotRegistry, "registryHash"> = {
    contractVersion: registry.contractVersion,
    generatedAt: registry.generatedAt,
    sourceCount: registry.sourceCount,
    sources: registry.sources,
  };
  if (computeSourceRegistryHash(withoutHash) !== registry.registryHash) {
    errors.push("REGISTRY_HASH_MISMATCH");
  }

  const sourceIds = registry.sources.map((source) => source.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) errors.push("DUPLICATE_SOURCE_ID");
  if (JSON.stringify(sorted(sourceIds)) !== JSON.stringify(sorted(context.expectedSourceIds))) {
    errors.push("SOURCE_SET_MISMATCH");
  }

  const sourceById = sourceRecordMap(registry);
  for (const source of registry.sources) {
    if (!officialHostname(source.authority, source.officialLocator)) {
      errors.push(`${source.sourceId}:NON_OFFICIAL_LOCATOR`);
    }
    if (!officialHostname(source.authority, source.finalOfficialLocator)) {
      errors.push(`${source.sourceId}:NON_OFFICIAL_REDIRECT`);
    }
    const expectedCaptureScope = new URL(source.officialLocator).hash
      ? "LOCATOR_FRAGMENT"
      : "FULL_DOCUMENT";
    if (source.captureScope !== expectedCaptureScope) {
      errors.push(`${source.sourceId}:CAPTURE_SCOPE_MISMATCH`);
    }
    if (source.verificationStatus !== "PENDING_FISCAL_REVIEW") {
      errors.push(`${source.sourceId}:PREMATURE_SOURCE_VERIFICATION`);
    }
    if (
      source.materialValidity.status !== "UNVERIFIED" ||
      source.materialValidity.basis !== "PENDING_FISCAL_REVIEW"
    ) {
      errors.push(`${source.sourceId}:PREMATURE_MATERIAL_VALIDITY`);
    }
    const snapshotPath = resolve(context.rootDirectory, source.snapshotPath);
    let bytes: Buffer;
    try {
      bytes = readFileSync(snapshotPath);
    } catch {
      errors.push(`${source.sourceId}:SNAPSHOT_MISSING`);
      continue;
    }
    if (bytes.byteLength !== source.contentLength) {
      errors.push(`${source.sourceId}:CONTENT_LENGTH_MISMATCH`);
    }
    if (sha256(bytes) !== source.snapshotHash) {
      errors.push(`${source.sourceId}:SNAPSHOT_HASH_MISMATCH`);
    }
  }

  for (const [ruleId, expectedSourceIds] of context.expectedRuleSourceIds) {
    for (const sourceId of expectedSourceIds) {
      const source = sourceById.get(sourceId);
      if (!source || !source.affectedRuleIds.includes(ruleId)) {
        errors.push(`${ruleId}:SOURCE_ASSOCIATION_MISSING:${sourceId}`);
      }
    }
  }

  for (const rule of context.expectedRuleStates) {
    if (rule.reviewStatus !== "PENDING_FISCAL_REVIEW") {
      errors.push(`${rule.ruleId}:RULE_NOT_PENDING`);
    }
    if (rule.resolutionStatus !== "OPEN") {
      errors.push(`${rule.ruleId}:RULE_NOT_OPEN`);
    }
    if (rule.exclusionAuthorized) {
      errors.push(`${rule.ruleId}:EXCLUSION_AUTHORIZED`);
    }
  }
  if (context.expectedRuleStates.length !== 54) {
    errors.push("EXPECTED_54_RULES");
  }

  const reviewIds = reviewRegistry.records.map((record) => record.reviewId);
  if (new Set(reviewIds).size !== reviewIds.length) errors.push("DUPLICATE_REVIEW_ID");
  for (const record of reviewRegistry.records) {
    errors.push(
      ...validateReviewRecord(
        record,
        context.expectedRuleStates,
        sourceById,
        context.expectedRuleSourceIds,
      ),
    );
  }
  for (const rule of context.expectedRuleStates) {
    const records = reviewRegistry.records.filter(
      (record) => record.ruleId === rule.ruleId,
    );
    const primaryRecords = records.filter(
      (record) => record.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
    );
    const secondRecords = records.filter(
      (record) => record.reviewerRole === "SECOND_FISCAL_REVIEWER",
    );
    if (primaryRecords.length > 1) {
      errors.push(`${rule.ruleId}:MULTIPLE_PRIMARY_REVIEWS`);
    }
    if (secondRecords.length > 1) {
      errors.push(`${rule.ruleId}:MULTIPLE_SECOND_REVIEWS`);
    }
    const primary = primaryRecords[0];
    const second = secondRecords[0];
    if (primary && second && primary.reviewerId === second.reviewerId) {
      errors.push(`${rule.ruleId}:SAME_REVIEWER_FOR_BOTH_ROLES`);
    }
  }

  return sorted([...new Set(errors)]);
}
