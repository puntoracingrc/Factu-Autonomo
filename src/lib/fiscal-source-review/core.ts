import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  FiscalReviewRegistry,
  FiscalRuleReviewDecision,
  FiscalSourceDiffEntry,
  FiscalSourceDiffReport,
  FiscalSourceSnapshot,
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

function isTextualContent(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("html") ||
    normalized.includes("xml") ||
    normalized.includes("json")
  );
}

export function normalizeSnapshotContent(
  bytes: Uint8Array,
  contentType: string,
): string | Uint8Array {
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

export function computeNormalizedContentHash(
  bytes: Uint8Array,
  contentType: string,
): `sha256:${string}` {
  return sha256(normalizeSnapshotContent(bytes, contentType));
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
        changeSummary: {
          ...source.changeSummary,
          changedFields: sorted(source.changeSummary.changedFields),
        },
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
): ReadonlyMap<string, FiscalSourceSnapshot> {
  return new Map(registry.sources.map((source) => [source.sourceId, source]));
}

const COMPARED_SOURCE_FIELDS = [
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
] as const satisfies readonly (keyof FiscalSourceSnapshot)[];

const MATERIAL_SOURCE_FIELDS = new Set<keyof FiscalSourceSnapshot>([
  "authority",
  "officialLocator",
  "materialValidity",
  "materialScope",
  "affectedRuleIds",
  "verificationStatus",
]);

function classifyChange(
  previous: FiscalSourceSnapshot,
  current: FiscalSourceSnapshot,
  changedFields: readonly (keyof FiscalSourceSnapshot)[],
): FiscalSourceDiffEntry["changeNature"] {
  if (changedFields.some((field) => MATERIAL_SOURCE_FIELDS.has(field))) {
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

function summarizeChange(
  changeType: FiscalSourceDiffEntry["changeType"],
  nature: FiscalSourceDiffEntry["changeNature"],
  fields: readonly string[],
): string {
  if (changeType === "NEW") return "Nueva fuente: requiere revisión fiscal.";
  if (changeType === "REMOVED") return "Fuente retirada: requiere revisión fiscal.";
  return `Fuente modificada (${nature.toLowerCase()}): ${fields.join(", ")}. Requiere revisión fiscal.`;
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
      const changedFields = ["source"];
      const changeNature = "INDETERMINATE" as const;
      changes.push({
        sourceId: source.sourceId,
        changeType: "NEW",
        changeNature,
        reviewRequirement: "REQUIRES_FISCAL_REVIEW",
        changeSummary: summarizeChange("NEW", changeNature, changedFields),
        changedFields,
        affectedRuleIds: sorted(source.affectedRuleIds),
      });
      continue;
    }

    const changedFields = COMPARED_SOURCE_FIELDS.filter(
      (field) =>
        JSON.stringify(previous[field]) !== JSON.stringify(source[field]),
    );
    if (changedFields.length > 0) {
      const changeNature = classifyChange(previous, source, changedFields);
      changes.push({
        sourceId: source.sourceId,
        changeType: "MODIFIED",
        changeNature,
        reviewRequirement: "REQUIRES_FISCAL_REVIEW",
        changeSummary: summarizeChange(
          "MODIFIED",
          changeNature,
          changedFields,
        ),
        changedFields,
        affectedRuleIds: sorted([
          ...new Set([
            ...previous.affectedRuleIds,
            ...source.affectedRuleIds,
          ]),
        ]),
      });
    }
  }

  for (const source of baseline.sources) {
    if (!candidateById.has(source.sourceId)) {
      const changedFields = ["source"];
      const changeNature = "INDETERMINATE" as const;
      changes.push({
        sourceId: source.sourceId,
        changeType: "REMOVED",
        changeNature,
        reviewRequirement: "REQUIRES_FISCAL_REVIEW",
        changeSummary: summarizeChange("REMOVED", changeNature, changedFields),
        changedFields,
        affectedRuleIds: sorted(source.affectedRuleIds),
      });
    }
  }

  changes.sort((left, right) => compareText(left.sourceId, right.sourceId));
  const affectedRuleIds = sorted(
    [...new Set(changes.flatMap((change) => change.affectedRuleIds))],
  );
  const affectedRuleSet = new Set(affectedRuleIds);
  const affectedActiveDecisions = reviewRegistry.decisions.filter(
    (decision) =>
      decision.revocation.status === "ACTIVE" &&
      affectedRuleSet.has(decision.ruleId),
  );
  const decisionIdsToRevoke = sorted(
    affectedActiveDecisions.map((decision) => decision.decisionId),
  );
  const ruleApprovalsToInvalidate = sorted([
    ...new Set(
      affectedActiveDecisions
        .filter((decision) => decision.decision === "APPROVE")
        .map((decision) => decision.ruleId),
    ),
  ]);

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
    if (authority === "BOE") {
      return hostname === "www.boe.es" || hostname === "boe.es";
    }
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

function validateTrust(decision: FiscalRuleReviewDecision): string[] {
  const errors: string[] = [];
  const prefix = decision.decisionId;
  const trust = decision.reviewerTrust;
  if (decision.origin !== "HUMAN_FISCAL_PROFESSIONAL") {
    errors.push(`${prefix}:AUTOMATED_OR_NON_FISCAL_REVIEW_FORBIDDEN`);
  }
  if (
    !trust ||
    trust.status !== "SERVER_VERIFIED" ||
    trust.subjectType !== "FISCAL_PROFESSIONAL" ||
    !trust.identityProvider?.trim() ||
    !trust.verifiedAt ||
    !trust.verificationReference?.trim()
  ) {
    errors.push(`${prefix}:SERVER_VERIFIED_FISCAL_IDENTITY_REQUIRED`);
  }
  return errors;
}

function validateRevocation(decision: FiscalRuleReviewDecision): string[] {
  if (!decision.revocation) {
    return [`${decision.decisionId}:INVALID_REVOCATION_STATUS`];
  }
  if (decision.revocation.status === "ACTIVE") {
    if (
      decision.revocation.revokedAt !== null ||
      decision.revocation.reason !== null ||
      decision.revocation.revocationReference !== null
    ) {
      return [`${decision.decisionId}:INVALID_ACTIVE_REVOCATION`];
    }
    return [];
  }
  if (
    !decision.revocation.revokedAt ||
    !decision.revocation.reason.trim() ||
    !decision.revocation.revocationReference.trim()
  ) {
    return [`${decision.decisionId}:INCOMPLETE_REVOCATION`];
  }
  return [];
}

function validateReviewDecision(
  decision: FiscalRuleReviewDecision,
  rules: FiscalSourceValidationContext["expectedRuleStates"],
  sourceById: ReadonlyMap<string, FiscalSourceSnapshot>,
  ruleSourceIds: ReadonlyMap<string, readonly string[]>,
): string[] {
  const errors: string[] = [];
  const rule = rules.find((candidate) => candidate.ruleId === decision.ruleId);
  if (!rule) return [`${decision.decisionId}:UNKNOWN_RULE`];
  if (
    decision.reviewerRole !== "PRIMARY_FISCAL_REVIEWER" &&
    decision.reviewerRole !== "SECOND_FISCAL_REVIEWER"
  ) {
    errors.push(`${decision.decisionId}:INVALID_REVIEWER_ROLE`);
  }
  if (
    decision.decision !== "APPROVE" &&
    decision.decision !== "REJECT" &&
    decision.decision !== "REQUEST_CHANGES"
  ) {
    errors.push(`${decision.decisionId}:INVALID_REVIEW_DECISION`);
  }
  if (!decision.reviewerId?.trim()) {
    errors.push(`${decision.decisionId}:MISSING_REVIEWER_ID`);
  }
  errors.push(...validateTrust(decision), ...validateRevocation(decision));
  if (!decision.signatureReference?.trim()) {
    errors.push(`${decision.decisionId}:MISSING_SIGNATURE_REFERENCE`);
  }
  if (
    decision.decision === "APPROVE" &&
    decision.findings?.some((finding) => finding.severity === "BLOCKING")
  ) {
    errors.push(`${decision.decisionId}:APPROVE_WITH_BLOCKING_FINDINGS`);
  }
  if (decision.reviewedRuleHash !== rule.ruleHash) {
    errors.push(`${decision.decisionId}:STALE_RULE_HASH`);
  }
  const expectedSources = sorted(ruleSourceIds.get(decision.ruleId) ?? []);
  const reviewedSources = sorted(
    decision.reviewedSourceHashes.map((source) => source.sourceId),
  );
  if (JSON.stringify(expectedSources) !== JSON.stringify(reviewedSources)) {
    errors.push(`${decision.decisionId}:INCOMPLETE_SOURCE_SET`);
  }
  for (const reviewedSource of decision.reviewedSourceHashes) {
    const current = sourceById.get(reviewedSource.sourceId);
    if (!current || current.contentHash !== reviewedSource.contentHash) {
      errors.push(
        `${decision.decisionId}:STALE_SOURCE_CONTENT_HASH:${reviewedSource.sourceId}`,
      );
    }
    if (
      !current ||
      current.normalizedContentHash !== reviewedSource.normalizedContentHash
    ) {
      errors.push(
        `${decision.decisionId}:STALE_SOURCE_NORMALIZED_HASH:${reviewedSource.sourceId}`,
      );
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
  if (new Set(sourceIds).size !== sourceIds.length) {
    errors.push("DUPLICATE_SOURCE_ID");
  }
  if (
    JSON.stringify(sorted(sourceIds)) !==
    JSON.stringify(sorted(context.expectedSourceIds))
  ) {
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
        source.changeSummary.nature !== "INITIAL" &&
        source.changeSummary.nature !== "NONE" &&
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
    if (sha256(bytes) !== source.contentHash) {
      errors.push(`${source.sourceId}:CONTENT_HASH_MISMATCH`);
    }
    if (
      computeNormalizedContentHash(bytes, source.contentType) !==
      source.normalizedContentHash
    ) {
      errors.push(`${source.sourceId}:NORMALIZED_CONTENT_HASH_MISMATCH`);
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

  const decisionIds = reviewRegistry.decisions.map(
    (decision) => decision.decisionId,
  );
  if (new Set(decisionIds).size !== decisionIds.length) {
    errors.push("DUPLICATE_REVIEW_DECISION_ID");
  }
  for (const decision of reviewRegistry.decisions) {
    errors.push(
      ...validateReviewDecision(
        decision,
        context.expectedRuleStates,
        sourceById,
        context.expectedRuleSourceIds,
      ),
    );
  }
  for (const rule of context.expectedRuleStates) {
    const activeDecisions = reviewRegistry.decisions.filter(
      (decision) =>
        decision.ruleId === rule.ruleId &&
        decision.revocation.status === "ACTIVE",
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
    const primary = primaryDecisions[0];
    const second = secondDecisions[0];
    if (primary && second && primary.reviewerId === second.reviewerId) {
      errors.push(`${rule.ruleId}:SAME_REVIEWER_FOR_BOTH_ROLES`);
    }
  }

  return sorted([...new Set(errors)]);
}
