import {
  buildDocumentLifecycleRiskMatrix,
  summarizeDocumentLifecycleRiskMatrix,
  type DocumentLifecycleRiskMatrix,
} from "./document-lifecycle-risk-matrix";
import {
  analyzeNumberingCountersRisk,
  summarizeNumberingCountersRisk,
  type NumberingCountersRiskAssessment,
} from "./numbering-counters-risk";
import {
  analyzeSnapshotPdfHashRisk,
  summarizeSnapshotPdfHashRisk,
  type SnapshotPdfHashRiskAssessment,
} from "./snapshot-pdf-hash-risk";
import {
  analyzeCustomerIdentityImportRisk,
  summarizeCustomerIdentityImportRisk,
  type CustomerIdentityRiskAssessment,
} from "./customer-identity-risk";
import {
  classifyLegacyBackupCompatibility,
  summarizeLegacyBackupCompatibility,
  type LegacyBackupCompatibilityClassification,
} from "./legacy-backup-compatibility";
import {
  evaluateLargeBackupBoundary,
  summarizeLargeBackupBoundary,
  type LargeBackupBoundaryAssessment,
} from "./large-backup-boundary";
import { summarizeAdversarialBackupCorpus, type AdversarialBackupCorpusSummary } from "./adversarial-backup-corpus";
import type { LocalDataSafetyAppData } from "./types";

// PHASE2D65_COMPOSITE_DATA_LOSS_RISK_AGGREGATOR_V1

export type CompositeDataLossSeverity = "low" | "medium" | "high" | "blocked";

export interface CompositeLocalDataLossRiskAssessmentInput {
  currentData: LocalDataSafetyAppData;
  incomingData: LocalDataSafetyAppData;
  lifecycle?: DocumentLifecycleRiskMatrix;
  numbering?: NumberingCountersRiskAssessment;
  snapshotPdfHash?: SnapshotPdfHashRiskAssessment;
  customerIdentity?: CustomerIdentityRiskAssessment;
  legacyCompatibility?: LegacyBackupCompatibilityClassification;
  largeBackupBoundary?: LargeBackupBoundaryAssessment;
  adversarialCorpus?: AdversarialBackupCorpusSummary;
  generatedAt?: string;
}

export interface CompositeLocalDataLossRiskAssessment {
  marker: "PHASE2D65_COMPOSITE_DATA_LOSS_RISK_AGGREGATOR_V1";
  generatedAt: string;
  severity: CompositeDataLossSeverity;
  blockers: string[];
  manualReviewRequired: boolean;
  topRisks: string[];
  recommendedNextSteps: string[];
  summaries: {
    lifecycle: ReturnType<typeof summarizeDocumentLifecycleRiskMatrix>;
    numbering: ReturnType<typeof summarizeNumberingCountersRisk>;
    snapshotPdfHash: ReturnType<typeof summarizeSnapshotPdfHashRisk>;
    customerIdentity: ReturnType<typeof summarizeCustomerIdentityImportRisk>;
    legacyCompatibility: ReturnType<typeof summarizeLegacyBackupCompatibility>;
    largeBackupBoundary: ReturnType<typeof summarizeLargeBackupBoundary>;
    adversarialCorpus: AdversarialBackupCorpusSummary;
  };
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface CompositeLocalDataLossRiskAssessmentSummary {
  severity: CompositeDataLossSeverity;
  blockers: string[];
  manualReviewRequired: boolean;
  topRisks: string[];
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function severityRank(value: CompositeDataLossSeverity): number {
  return { low: 1, medium: 2, high: 3, blocked: 4 }[value];
}

function maxSeverity(values: CompositeDataLossSeverity[]): CompositeDataLossSeverity {
  return values.reduce((current, value) => (severityRank(value) > severityRank(current) ? value : current), "low");
}

function fromRiskSeverity(value: "info" | "warning" | "blocked"): CompositeDataLossSeverity {
  if (value === "blocked") return "blocked";
  if (value === "warning") return "medium";
  return "low";
}

export function buildCompositeLocalDataLossRiskAssessment(
  input: CompositeLocalDataLossRiskAssessmentInput,
): CompositeLocalDataLossRiskAssessment {
  const lifecycle = input.lifecycle ?? buildDocumentLifecycleRiskMatrix(input.incomingData, { generatedAt: input.generatedAt });
  const numbering =
    input.numbering ?? analyzeNumberingCountersRisk(input.currentData, input.incomingData, { generatedAt: input.generatedAt });
  const snapshotPdfHash =
    input.snapshotPdfHash ?? analyzeSnapshotPdfHashRisk(input.currentData, input.incomingData, { generatedAt: input.generatedAt });
  const customerIdentity =
    input.customerIdentity ?? analyzeCustomerIdentityImportRisk(input.currentData, input.incomingData, { generatedAt: input.generatedAt });
  const legacyCompatibility =
    input.legacyCompatibility ?? classifyLegacyBackupCompatibility(input.incomingData, { generatedAt: input.generatedAt });
  const largeBackupBoundary =
    input.largeBackupBoundary ?? evaluateLargeBackupBoundary(input.incomingData, { generatedAt: input.generatedAt });
  const adversarialCorpus = input.adversarialCorpus ?? summarizeAdversarialBackupCorpus();

  const summaries = {
    lifecycle: summarizeDocumentLifecycleRiskMatrix(lifecycle),
    numbering: summarizeNumberingCountersRisk(numbering),
    snapshotPdfHash: summarizeSnapshotPdfHashRisk(snapshotPdfHash),
    customerIdentity: summarizeCustomerIdentityImportRisk(customerIdentity),
    legacyCompatibility: summarizeLegacyBackupCompatibility(legacyCompatibility),
    largeBackupBoundary: summarizeLargeBackupBoundary(largeBackupBoundary),
    adversarialCorpus,
  };

  const severities: CompositeDataLossSeverity[] = [
    summaries.lifecycle.totals.blocked > 0 ? "blocked" : summaries.lifecycle.totals.manual_review > 0 ? "medium" : "low",
    fromRiskSeverity(summaries.numbering.highestSeverity),
    fromRiskSeverity(summaries.snapshotPdfHash.highestSeverity),
    fromRiskSeverity(summaries.customerIdentity.highestSeverity),
    summaries.legacyCompatibility.status === "blocked"
      ? "blocked"
      : summaries.legacyCompatibility.status === "manual_review_required"
        ? "medium"
        : "low",
    summaries.largeBackupBoundary.status === "over_limit"
      ? "high"
      : summaries.largeBackupBoundary.status === "near_limit" ||
          summaries.largeBackupBoundary.status === "manual_review_required"
        ? "medium"
        : "low",
    summaries.adversarialCorpus.unsafeCases > 0 ? "medium" : "low",
  ];
  const severity = maxSeverity(severities);
  const blockers = [
    ...(summaries.lifecycle.totals.blocked > 0 ? ["protected_document_lifecycle_blocker"] : []),
    ...(summaries.numbering.highestSeverity === "blocked" ? ["numbering_counter_blocker"] : []),
    ...(summaries.snapshotPdfHash.highestSeverity === "blocked" ? ["snapshot_pdf_hash_blocker"] : []),
    ...(summaries.customerIdentity.highestSeverity === "blocked" ? ["customer_identity_blocker"] : []),
    ...(summaries.legacyCompatibility.status === "blocked" ? ["legacy_compatibility_blocker"] : []),
  ];
  const topRisks = [
    ...summaries.numbering.riskIds,
    ...summaries.snapshotPdfHash.riskIds,
    ...summaries.customerIdentity.riskIds,
    ...summaries.legacyCompatibility.issueIds,
    ...summaries.largeBackupBoundary.reasons,
  ].slice(0, 12);

  return {
    marker: "PHASE2D65_COMPOSITE_DATA_LOSS_RISK_AGGREGATOR_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    severity,
    blockers,
    manualReviewRequired: severity !== "low" || blockers.length > 0,
    topRisks,
    recommendedNextSteps: [
      "Review synthetic risk report with UX/legal/data-loss owners.",
      "Keep import and restore apply disabled.",
      "Do not connect UI wiring until explicit approval.",
    ],
    summaries,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

export function summarizeCompositeLocalDataLossRiskAssessment(
  assessment: CompositeLocalDataLossRiskAssessment,
): CompositeLocalDataLossRiskAssessmentSummary {
  return {
    severity: assessment.severity,
    blockers: [...assessment.blockers],
    manualReviewRequired: assessment.manualReviewRequired,
    topRisks: [...assessment.topRisks],
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
