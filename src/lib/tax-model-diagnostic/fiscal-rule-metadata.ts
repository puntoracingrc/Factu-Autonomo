import type {
  FiscalExclusionCandidate,
  FiscalRuleMetadata,
  OfficialSource,
  TaxModelNumber,
} from "./contracts";
import { computeFiscalRuleHash } from "./fiscal-rule-hash";

export interface PendingFiscalRuleMetadataInput {
  ruleId: string;
  rulesetId: string;
  model: TaxModelNumber;
  fiscalYear: 2025 | 2026;
  territory: "ES_COMMON";
  effectiveFrom: string;
  effectiveTo: string | null;
  conditions: readonly string[];
  exclusions: readonly string[];
  result: string;
  officialSources: readonly OfficialSource[];
  testCaseIds: readonly string[];
}

export function buildPendingFiscalRuleMetadata(
  input: PendingFiscalRuleMetadataInput,
): FiscalRuleMetadata {
  const sourceIds = input.officialSources.map((source) => source.sourceId);
  const sourceSnapshots = input.officialSources.map((source) => ({
    sourceId: source.sourceId,
    authority: source.authority,
    title: source.title,
    officialLocator: source.url,
    sourceType: "OFFICIAL_REFERENCE" as const,
    publishedAt: source.officialUpdatedAt,
    effectiveFrom: null,
    effectiveTo: null,
    retrievedAt: source.lastVerifiedAt,
    snapshotHash: null,
    materialScope: source.location,
    status: "UNVERIFIED" as const,
    supersedesSourceId: null,
    verifiedBy: null,
    verifiedAt: null,
  }));
  const exclusionCandidates: FiscalExclusionCandidate[] = input.exclusions.map(
    (description, index) => ({
      exclusionId: `${input.ruleId}.exclusion-${index + 1}`,
      description,
      effectType: "ADVISORY_EXCLUSION_CANDIDATE",
      model: input.model,
      conditions: [],
      exceptionIds: [],
      reviewStatus: "PENDING_FISCAL_REVIEW",
      resolutionStatus: "OPEN",
      sourceIds,
      testCaseIds: input.testCaseIds.filter((testId) =>
        testId.endsWith(".exception"),
      ),
    }),
  );
  const metadataWithoutHash: Omit<FiscalRuleMetadata, "ruleHash"> = {
    ruleId: input.ruleId,
    rulesetId: input.rulesetId,
    model: input.model,
    fiscalYear: input.fiscalYear,
    territory: input.territory,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    review: {
      reviewStatus: "PENDING_FISCAL_REVIEW",
      resolutionStatus: "OPEN",
      testsStatus: "NOT_IMPLEMENTED",
      sourceStatus: "UNVERIFIED",
      issueIds: [`fiscal-closure.${input.ruleId}`],
      primaryFiscalReviewer: null,
      secondFiscalReviewer: null,
      technicalReviewer: null,
      reviewedAt: null,
      resolvedAt: null,
      approvedAt: null,
      approvedRuleHash: null,
      approvalEvidenceId: null,
      approvalEvidenceVerified: false,
      approvalEvidenceOrigin: null,
      comments: [],
    },
    sourceSnapshots,
    exclusionCandidates,
    testCaseIds: [...input.testCaseIds],
    questionIds: [],
    factIds: [],
  };

  return {
    ...metadataWithoutHash,
    ruleHash: computeFiscalRuleHash({
      ruleId: input.ruleId,
      model: input.model,
      fiscalYear: input.fiscalYear,
      territory: input.territory,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      conditions: input.conditions,
      factIds: metadataWithoutHash.factIds,
      result: input.result,
      exclusions: input.exclusions,
      exclusionCandidates,
      sourceSnapshots,
    }),
  };
}

