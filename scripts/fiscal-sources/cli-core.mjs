import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function canonicalRegistry(registry) {
  return JSON.stringify({
    contractVersion: registry.contractVersion,
    generatedAt: registry.generatedAt,
    sourceCount: registry.sourceCount,
    sources: [...registry.sources]
      .map((source) => ({
        ...source,
        affectedRuleIds: [...source.affectedRuleIds].sort(),
      }))
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  });
}

export function registryHash(registry) {
  return sha256(canonicalRegistry(registry));
}

export function diffRegistries(baseline, candidate, reviews) {
  const baselineById = new Map(
    baseline.sources.map((source) => [source.sourceId, source]),
  );
  const candidateById = new Map(
    candidate.sources.map((source) => [source.sourceId, source]),
  );
  const changes = [];
  const comparedFields = [
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
  ];

  for (const source of candidate.sources) {
    const previous = baselineById.get(source.sourceId);
    if (!previous) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "NEW",
        changedFields: ["source"],
        affectedRuleIds: [...source.affectedRuleIds].sort(),
      });
      continue;
    }
    const changedFields = comparedFields.filter(
      (field) => JSON.stringify(previous[field]) !== JSON.stringify(source[field]),
    );
    if (changedFields.length > 0) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "MODIFIED",
        changedFields,
        affectedRuleIds: [
          ...new Set([...previous.affectedRuleIds, ...source.affectedRuleIds]),
        ].sort(),
      });
    }
  }
  for (const source of baseline.sources) {
    if (!candidateById.has(source.sourceId)) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "REMOVED",
        changedFields: ["source"],
        affectedRuleIds: [...source.affectedRuleIds].sort(),
      });
    }
  }
  changes.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const affectedRuleIds = [
    ...new Set(changes.flatMap((change) => change.affectedRuleIds)),
  ].sort();
  const affectedRules = new Set(affectedRuleIds);
  const reviewIdsToInvalidate = reviews.records
    .filter((review) => affectedRules.has(review.ruleId))
    .map((review) => review.reviewId)
    .sort();
  const ruleApprovalsToInvalidate = [
    ...new Set(
      reviews.records
        .filter(
          (review) =>
            review.decision === "APPROVE" && affectedRules.has(review.ruleId),
        )
        .map((review) => review.ruleId),
    ),
  ].sort();
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

function isOfficial(authority, locator) {
  try {
    const host = new URL(locator).hostname.toLowerCase();
    if (authority === "BOE") return host === "boe.es" || host === "www.boe.es";
    if (authority === "AEAT") return host.endsWith("agenciatributaria.gob.es");
    if (authority === "SEGURIDAD_SOCIAL") return host.endsWith("seg-social.es");
    if (authority === "EU") return host.endsWith("europa.eu");
    return false;
  } catch {
    return false;
  }
}

export function validateState({
  root,
  registry,
  reviews,
  currentSources,
  inventory,
  associations,
}) {
  const errors = [];
  if (registry.contractVersion !== "fiscal-source-registry.v1") {
    errors.push("INVALID_SOURCE_REGISTRY_VERSION");
  }
  if (reviews.contractVersion !== "fiscal-review-registry.v1") {
    errors.push("INVALID_REVIEW_REGISTRY_VERSION");
  }
  if (registry.sourceCount !== registry.sources.length) {
    errors.push("SOURCE_COUNT_MISMATCH");
  }
  const unsigned = {
    contractVersion: registry.contractVersion,
    generatedAt: registry.generatedAt,
    sourceCount: registry.sourceCount,
    sources: registry.sources,
  };
  if (registryHash(unsigned) !== registry.registryHash) {
    errors.push("REGISTRY_HASH_MISMATCH");
  }
  const ids = registry.sources.map((source) => source.sourceId);
  if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_SOURCE_ID");
  const expectedIds = currentSources.map((source) => source.sourceId).sort();
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(expectedIds)) {
    errors.push("SOURCE_SET_MISMATCH");
  }
  const sourceById = new Map(
    registry.sources.map((source) => [source.sourceId, source]),
  );
  for (const source of registry.sources) {
    if (!isOfficial(source.authority, source.officialLocator)) {
      errors.push(`${source.sourceId}:NON_OFFICIAL_LOCATOR`);
    }
    if (!isOfficial(source.authority, source.finalOfficialLocator)) {
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
    try {
      const bytes = readFileSync(resolve(root, source.snapshotPath));
      if (bytes.byteLength !== source.contentLength) {
        errors.push(`${source.sourceId}:CONTENT_LENGTH_MISMATCH`);
      }
      if (sha256(bytes) !== source.snapshotHash) {
        errors.push(`${source.sourceId}:SNAPSHOT_HASH_MISMATCH`);
      }
    } catch {
      errors.push(`${source.sourceId}:SNAPSHOT_MISSING`);
    }
    const expected = currentSources.find(
      (candidate) => candidate.sourceId === source.sourceId,
    );
    if (
      !expected ||
      expected.officialLocator !== source.officialLocator ||
      expected.materialScope !== source.materialScope ||
      expected.authority !== source.authority
    ) {
      errors.push(`${source.sourceId}:SOURCE_DEFINITION_DRIFT`);
    }
    const expectedRules = associations.get(source.sourceId) ?? [];
    if (
      JSON.stringify([...source.affectedRuleIds].sort()) !==
      JSON.stringify([...expectedRules].sort())
    ) {
      errors.push(`${source.sourceId}:RULE_ASSOCIATION_DRIFT`);
    }
  }
  if (inventory.rules.length !== 54) errors.push("EXPECTED_54_RULES");
  for (const rule of inventory.rules) {
    if (rule.reviewStatus !== "PENDING_FISCAL_REVIEW") {
      errors.push(`${rule.ruleId}:RULE_NOT_PENDING`);
    }
    if (rule.resolutionStatus !== "OPEN") {
      errors.push(`${rule.ruleId}:RULE_NOT_OPEN`);
    }
    if (rule.exclusionAuthorized) {
      errors.push(`${rule.ruleId}:EXCLUSION_AUTHORIZED`);
    }
    for (const sourceId of rule.sourceIds) {
      if (!sourceById.get(sourceId)?.affectedRuleIds.includes(rule.ruleId)) {
        errors.push(`${rule.ruleId}:SOURCE_ASSOCIATION_MISSING:${sourceId}`);
      }
    }
  }
  const reviewIds = reviews.records.map((review) => review.reviewId);
  if (new Set(reviewIds).size !== reviewIds.length) {
    errors.push("DUPLICATE_REVIEW_ID");
  }
  for (const review of reviews.records) {
    const rule = inventory.rules.find((candidate) => candidate.ruleId === review.ruleId);
    if (!rule) {
      errors.push(`${review.reviewId}:UNKNOWN_RULE`);
      continue;
    }
    if (review.origin !== "HUMAN_SIGNED_FISCAL_REVIEW") {
      errors.push(`${review.reviewId}:AUTOMATED_REVIEW_FORBIDDEN`);
    }
    if (
      review.reviewerRole !== "PRIMARY_FISCAL_REVIEWER" &&
      review.reviewerRole !== "SECOND_FISCAL_REVIEWER"
    ) {
      errors.push(`${review.reviewId}:INVALID_REVIEWER_ROLE`);
    }
    if (
      review.decision !== "APPROVE" &&
      review.decision !== "REJECT" &&
      review.decision !== "REQUEST_CHANGES"
    ) {
      errors.push(`${review.reviewId}:INVALID_REVIEW_DECISION`);
    }
    if (!review.reviewerId?.trim()) {
      errors.push(`${review.reviewId}:MISSING_REVIEWER_ID`);
    }
    if (!review.signatureReference?.trim()) {
      errors.push(`${review.reviewId}:MISSING_SIGNATURE_REFERENCE`);
    }
    if (
      review.decision === "APPROVE" &&
      review.findings?.some((finding) => finding.severity === "BLOCKING")
    ) {
      errors.push(`${review.reviewId}:APPROVE_WITH_BLOCKING_FINDINGS`);
    }
    if (review.reviewedRuleHash !== rule.ruleHash) {
      errors.push(`${review.reviewId}:STALE_RULE_HASH`);
    }
    const expectedSourceIds = [...rule.sourceIds].sort();
    const reviewedSourceIds = review.reviewedSourceHashes
      .map((source) => source.sourceId)
      .sort();
    if (JSON.stringify(expectedSourceIds) !== JSON.stringify(reviewedSourceIds)) {
      errors.push(`${review.reviewId}:INCOMPLETE_SOURCE_SET`);
    }
    for (const reviewedSource of review.reviewedSourceHashes) {
      if (
        sourceById.get(reviewedSource.sourceId)?.snapshotHash !==
        reviewedSource.snapshotHash
      ) {
        errors.push(`${review.reviewId}:STALE_SOURCE_HASH:${reviewedSource.sourceId}`);
      }
    }
  }
  for (const rule of inventory.rules) {
    const ruleReviews = reviews.records.filter(
      (review) => review.ruleId === rule.ruleId,
    );
    const primaryReviews = ruleReviews.filter(
      (review) => review.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
    );
    const secondReviews = ruleReviews.filter(
      (review) => review.reviewerRole === "SECOND_FISCAL_REVIEWER",
    );
    if (primaryReviews.length > 1) {
      errors.push(`${rule.ruleId}:MULTIPLE_PRIMARY_REVIEWS`);
    }
    if (secondReviews.length > 1) {
      errors.push(`${rule.ruleId}:MULTIPLE_SECOND_REVIEWS`);
    }
    const primary = primaryReviews[0];
    const second = secondReviews[0];
    if (primary && second && primary.reviewerId === second.reviewerId) {
      errors.push(`${rule.ruleId}:SAME_REVIEWER_FOR_BOTH_ROLES`);
    }
  }
  return [...new Set(errors)].sort();
}
