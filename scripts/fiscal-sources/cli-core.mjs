import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function isTextualContent(contentType) {
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("html") ||
    normalized.includes("xml") ||
    normalized.includes("json")
  );
}

export function normalizeSnapshotContent(bytes, contentType) {
  if (!isTextualContent(contentType)) return bytes;
  return new TextDecoder()
    .decode(bytes)
    .replace(/^\uFEFF/, "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/>\s+</g, "><")
    .trim();
}

export function normalizedContentHash(bytes, contentType) {
  return sha256(normalizeSnapshotContent(bytes, contentType));
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
        changeSummary: {
          ...source.changeSummary,
          changedFields: [...source.changeSummary.changedFields].sort(),
        },
      }))
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  });
}

export function registryHash(registry) {
  return sha256(canonicalRegistry(registry));
}

const COMPARED_FIELDS = [
  "authority",
  "title",
  "officialLocator",
  "finalOfficialLocator",
  "declaredOfficialUpdatedAt",
  "materialValidity",
  "contentHash",
  "normalizedContentHash",
  "contentLength",
  "contentType",
  "captureScope",
  "materialScope",
  "affectedRuleIds",
  "verificationStatus",
];

const MATERIAL_FIELDS = new Set([
  "authority",
  "officialLocator",
  "materialValidity",
  "materialScope",
  "affectedRuleIds",
  "verificationStatus",
]);

export function classifySourceChange(previous, current, changedFields) {
  if (changedFields.some((field) => MATERIAL_FIELDS.has(field))) {
    return "MATERIAL";
  }
  if (
    previous.contentHash !== current.contentHash &&
    previous.normalizedContentHash === current.normalizedContentHash
  ) {
    return "TECHNICAL";
  }
  return "INDETERMINATE";
}

export function snapshotChangeMetadata(previous, current) {
  if (!previous) {
    return {
      previousSnapshotHash: null,
      changeDetected: false,
      changeSummary: {
        status: "INITIAL_CAPTURE",
        nature: "INITIAL",
        requiresFiscalReview: false,
        changedFields: [],
      },
    };
  }
  const changedFields = COMPARED_FIELDS.filter(
    (field) => JSON.stringify(previous[field]) !== JSON.stringify(current[field]),
  );
  const changeDetected = changedFields.length > 0;
  return {
    previousSnapshotHash: previous.contentHash,
    changeDetected,
    changeSummary: {
      status: changeDetected ? "CHANGED" : "UNCHANGED",
      nature: changeDetected
        ? classifySourceChange(previous, current, changedFields)
        : "NONE",
      requiresFiscalReview: changeDetected,
      changedFields,
    },
  };
}

function summary(changeType, nature, changedFields) {
  if (changeType === "NEW") return "Nueva fuente: requiere revisión fiscal.";
  if (changeType === "REMOVED") return "Fuente retirada: requiere revisión fiscal.";
  return `Fuente modificada (${nature.toLowerCase()}): ${changedFields.join(", ")}. Requiere revisión fiscal.`;
}

export function diffRegistries(baseline, candidate, reviews) {
  const baselineById = new Map(
    baseline.sources.map((source) => [source.sourceId, source]),
  );
  const candidateById = new Map(
    candidate.sources.map((source) => [source.sourceId, source]),
  );
  const changes = [];

  for (const source of candidate.sources) {
    const previous = baselineById.get(source.sourceId);
    if (!previous) {
      changes.push({
        sourceId: source.sourceId,
        changeType: "NEW",
        changeNature: "INDETERMINATE",
        reviewRequirement: "REQUIRES_FISCAL_REVIEW",
        changeSummary: summary("NEW", "INDETERMINATE", ["source"]),
        changedFields: ["source"],
        affectedRuleIds: [...source.affectedRuleIds].sort(),
      });
      continue;
    }
    const changedFields = COMPARED_FIELDS.filter(
      (field) => JSON.stringify(previous[field]) !== JSON.stringify(source[field]),
    );
    if (changedFields.length > 0) {
      const changeNature = classifySourceChange(previous, source, changedFields);
      changes.push({
        sourceId: source.sourceId,
        changeType: "MODIFIED",
        changeNature,
        reviewRequirement: "REQUIRES_FISCAL_REVIEW",
        changeSummary: summary("MODIFIED", changeNature, changedFields),
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
        changeNature: "INDETERMINATE",
        reviewRequirement: "REQUIRES_FISCAL_REVIEW",
        changeSummary: summary("REMOVED", "INDETERMINATE", ["source"]),
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
  const affectedActiveDecisions = reviews.decisions.filter(
    (decision) =>
      decision.revocation.status === "ACTIVE" &&
      affectedRules.has(decision.ruleId),
  );
  const decisionIdsToRevoke = affectedActiveDecisions
    .map((decision) => decision.decisionId)
    .sort();
  const ruleApprovalsToInvalidate = [
    ...new Set(
      affectedActiveDecisions
        .filter((decision) => decision.decision === "APPROVE")
        .map((decision) => decision.ruleId),
    ),
  ].sort();
  return {
    contractVersion: "fiscal-source-diff.v2",
    baselineRegistryHash: baseline.registryHash,
    candidateRegistryHash: candidate.registryHash,
    status:
      changes.length === 0 ? "CLEAN" : "CHANGED_REQUIRES_FISCAL_REVIEW",
    changes,
    affectedRuleIds,
    decisionIdsToRevoke,
    ruleApprovalsToInvalidate,
    automaticallyIrrelevantChanges: [],
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

export function validateDecision(decision, inventory, sourceById) {
  const errors = [];
  const rule = inventory.rules.find((candidate) => candidate.ruleId === decision.ruleId);
  if (!rule) return [`${decision.decisionId}:UNKNOWN_RULE`];
  const technical = decision.reviewerRole === "TECHNICAL_REVIEWER";
  const expectedOrigin = technical
    ? "HUMAN_TECHNICAL_REVIEWER"
    : "HUMAN_FISCAL_PROFESSIONAL";
  const expectedSubject = technical
    ? "TECHNICAL_REVIEWER"
    : "FISCAL_PROFESSIONAL";
  if (
    decision.origin !== "HUMAN_FISCAL_PROFESSIONAL" &&
    decision.origin !== "HUMAN_TECHNICAL_REVIEWER"
  ) {
    errors.push(`${decision.decisionId}:AUTOMATED_OR_NON_FISCAL_REVIEW_FORBIDDEN`);
  }
  if (decision.origin !== expectedOrigin) {
    errors.push(`${decision.decisionId}:REVIEWER_IDENTITY_ROLE_MISMATCH`);
  }
  if (
    decision.reviewerRole !== "PRIMARY_FISCAL_REVIEWER" &&
    decision.reviewerRole !== "SECOND_FISCAL_REVIEWER" &&
    decision.reviewerRole !== "TECHNICAL_REVIEWER"
  ) {
    errors.push(`${decision.decisionId}:INVALID_REVIEWER_ROLE`);
  }
  if (
    !["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(decision.decision)
  ) {
    errors.push(`${decision.decisionId}:INVALID_REVIEW_DECISION`);
  }
  if (!decision.reviewerId?.trim()) {
    errors.push(`${decision.decisionId}:MISSING_REVIEWER_ID`);
  }
  if (
    decision.reviewerTrust?.status !== "SERVER_VERIFIED" ||
    decision.reviewerTrust?.subjectType !== expectedSubject ||
    !decision.reviewerTrust?.identityProvider?.trim() ||
    !decision.reviewerTrust?.verifiedAt ||
    !decision.reviewerTrust?.verificationReference?.trim()
  ) {
    errors.push(`${decision.decisionId}:SERVER_VERIFIED_REVIEWER_IDENTITY_REQUIRED`);
  }
  if (!decision.signatureReference?.trim()) {
    errors.push(`${decision.decisionId}:MISSING_SIGNATURE_REFERENCE`);
  }
  if (
    decision.decision === "APPROVE" &&
    decision.findings?.some((finding) => finding.severity === "BLOCKING")
  ) {
    errors.push(`${decision.decisionId}:APPROVE_WITH_BLOCKING_FINDINGS`);
  }
  if (
    decision.reviewedRuleHash !==
    (rule.approvalFiscalHash ?? rule.ruleHash)
  ) {
    errors.push(`${decision.decisionId}:STALE_RULE_HASH`);
  }
  const expectedSourceIds = [...rule.sourceIds].sort();
  const reviewedSourceIds = decision.reviewedSourceHashes
    .map((source) => source.sourceId)
    .sort();
  if (JSON.stringify(expectedSourceIds) !== JSON.stringify(reviewedSourceIds)) {
    errors.push(`${decision.decisionId}:INCOMPLETE_SOURCE_SET`);
  }
  for (const reviewedSource of decision.reviewedSourceHashes) {
    const current = sourceById.get(reviewedSource.sourceId);
    if (current?.contentHash !== reviewedSource.contentHash) {
      errors.push(
        `${decision.decisionId}:STALE_SOURCE_CONTENT_HASH:${reviewedSource.sourceId}`,
      );
    }
    if (current?.normalizedContentHash !== reviewedSource.normalizedContentHash) {
      errors.push(
        `${decision.decisionId}:STALE_SOURCE_NORMALIZED_HASH:${reviewedSource.sourceId}`,
      );
    }
  }
  if (decision.revocation?.status === "ACTIVE") {
    if (
      decision.revocation.revokedAt !== null ||
      decision.revocation.reason !== null ||
      decision.revocation.revocationReference !== null
    ) {
      errors.push(`${decision.decisionId}:INVALID_ACTIVE_REVOCATION`);
    }
  } else if (decision.revocation?.status === "REVOKED") {
    if (
      !decision.revocation.revokedAt ||
      !decision.revocation.reason?.trim() ||
      !decision.revocation.revocationReference?.trim()
    ) {
      errors.push(`${decision.decisionId}:INCOMPLETE_REVOCATION`);
    }
  } else {
    errors.push(`${decision.decisionId}:INVALID_REVOCATION_STATUS`);
  }
  return errors;
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
  if (registry.contractVersion !== "fiscal-source-registry.v2") {
    errors.push("INVALID_SOURCE_REGISTRY_VERSION");
  }
  if (reviews.contractVersion !== "fiscal-review-registry.v2") {
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
    if (
      source.previousSnapshotHash === null &&
      (source.changeDetected ||
        source.changeSummary.status !== "INITIAL_CAPTURE" ||
        source.changeSummary.nature !== "INITIAL" ||
        source.changeSummary.requiresFiscalReview ||
        source.changeSummary.changedFields.length > 0)
    ) {
      errors.push(`${source.sourceId}:INVALID_INITIAL_CHANGE_HISTORY`);
    }
    if (source.previousSnapshotHash !== null) {
      const validChangedHistory =
        source.changeDetected &&
        source.changeSummary.status === "CHANGED" &&
        !["INITIAL", "NONE"].includes(source.changeSummary.nature) &&
        source.changeSummary.requiresFiscalReview &&
        source.changeSummary.changedFields.length > 0;
      const validUnchangedHistory =
        !source.changeDetected &&
        source.changeSummary.status === "UNCHANGED" &&
        source.changeSummary.nature === "NONE" &&
        !source.changeSummary.requiresFiscalReview &&
        source.changeSummary.changedFields.length === 0;
      if (!validChangedHistory && !validUnchangedHistory) {
        errors.push(`${source.sourceId}:INCONSISTENT_CHANGE_HISTORY`);
      }
    }
    try {
      const bytes = readFileSync(resolve(root, source.snapshotPath));
      if (bytes.byteLength !== source.contentLength) {
        errors.push(`${source.sourceId}:CONTENT_LENGTH_MISMATCH`);
      }
      if (sha256(bytes) !== source.contentHash) {
        errors.push(`${source.sourceId}:CONTENT_HASH_MISMATCH`);
      }
      if (normalizedContentHash(bytes, source.contentType) !== source.normalizedContentHash) {
        errors.push(`${source.sourceId}:NORMALIZED_CONTENT_HASH_MISMATCH`);
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
  const decisionIds = reviews.decisions.map((decision) => decision.decisionId);
  if (new Set(decisionIds).size !== decisionIds.length) {
    errors.push("DUPLICATE_REVIEW_DECISION_ID");
  }
  for (const decision of reviews.decisions) {
    errors.push(...validateDecision(decision, inventory, sourceById));
  }
  for (const rule of inventory.rules) {
    const activeDecisions = reviews.decisions.filter(
      (decision) =>
        decision.ruleId === rule.ruleId && decision.revocation.status === "ACTIVE",
    );
    const primaryDecisions = activeDecisions.filter(
      (decision) => decision.reviewerRole === "PRIMARY_FISCAL_REVIEWER",
    );
    const secondDecisions = activeDecisions.filter(
      (decision) => decision.reviewerRole === "SECOND_FISCAL_REVIEWER",
    );
    if (primaryDecisions.length > 1) {
      errors.push(`${rule.ruleId}:MULTIPLE_PRIMARY_REVIEWS`);
    }
    if (secondDecisions.length > 1) {
      errors.push(`${rule.ruleId}:MULTIPLE_SECOND_REVIEWS`);
    }
    if (
      primaryDecisions[0] &&
      secondDecisions[0] &&
      primaryDecisions[0].reviewerId === secondDecisions[0].reviewerId
    ) {
      errors.push(`${rule.ruleId}:SAME_REVIEWER_FOR_BOTH_ROLES`);
    }
  }
  return [...new Set(errors)].sort();
}
