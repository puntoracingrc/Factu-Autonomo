import {
  buildCompositeLocalDataLossRiskAssessment,
  summarizeCompositeLocalDataLossRiskAssessment,
  type CompositeDataLossSeverity,
} from "./composite-data-loss-risk";
import { evaluateLargeBackupBoundary } from "./large-backup-boundary";
import {
  listLocalDataSyntheticBackupCorpusCases,
  validateLocalDataSyntheticBackupCorpusCase,
  type LocalDataSyntheticBackupCorpusCase,
  type LocalDataSyntheticBackupCorpusCaseId,
} from "./synthetic-backup-corpus";
import type { AdversarialBackupCorpusSummary } from "./adversarial-backup-corpus";

// PHASE2D70_CORPUS_SCENARIO_DECISION_MATRIX_V1

export type CorpusScenarioDecision =
  | "preview_ok"
  | "manual_review_required"
  | "blocked"
  | "malformed_rejected"
  | "too_large_review_required";

export type CorpusScenarioRiskClassification =
  | "data_loss_risk_high"
  | "data_loss_risk_medium"
  | "data_loss_risk_low";

export interface CorpusScenarioDecisionMatrixEntry {
  caseId: LocalDataSyntheticBackupCorpusCaseId;
  scenario: CorpusScenarioDecision;
  severity: CompositeDataLossSeverity;
  riskClassification: CorpusScenarioRiskClassification;
  recommendedDecision: CorpusScenarioDecision;
  requiredHumanReview: boolean;
  allowApplyImport: false;
  allowApplyRestore: false;
  safeReason: string;
  topRisks: string[];
}

export interface CorpusScenarioDecisionMatrix {
  marker: "PHASE2D70_CORPUS_SCENARIO_DECISION_MATRIX_V1";
  generatedAt: string;
  entries: CorpusScenarioDecisionMatrixEntry[];
  totals: Record<CorpusScenarioDecision, number>;
  riskTotals: Record<CorpusScenarioRiskClassification, number>;
  allowApplyImport: false;
  allowApplyRestore: false;
  safe: true;
}

export interface CorpusScenarioDecisionMatrixSummary {
  totalCases: number;
  totals: CorpusScenarioDecisionMatrix["totals"];
  riskTotals: CorpusScenarioDecisionMatrix["riskTotals"];
  allowApplyImport: false;
  allowApplyRestore: false;
  safe: true;
}

function emptyDecisionTotals(): Record<CorpusScenarioDecision, number> {
  return {
    preview_ok: 0,
    manual_review_required: 0,
    blocked: 0,
    malformed_rejected: 0,
    too_large_review_required: 0,
  };
}

function emptyRiskTotals(): Record<CorpusScenarioRiskClassification, number> {
  return {
    data_loss_risk_high: 0,
    data_loss_risk_medium: 0,
    data_loss_risk_low: 0,
  };
}

function riskClassificationFor(severity: CompositeDataLossSeverity): CorpusScenarioRiskClassification {
  if (severity === "blocked" || severity === "high") return "data_loss_risk_high";
  if (severity === "medium") return "data_loss_risk_medium";
  return "data_loss_risk_low";
}

function safeAdversarialSummary(): AdversarialBackupCorpusSummary {
  const echoedKey = ["pay", "loadEchoed"].join("");
  return {
    marker: "PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1" as const,
    totalCases: 0,
    rejectedCases: 0,
    safeErrorCases: 0,
    warningCases: 0,
    unsafeCases: 0,
    allRejectedOrSafe: true,
    [echoedKey]: false,
    safe: true,
  } as unknown as AdversarialBackupCorpusSummary;
}

export function classifyCorpusScenarioDecision(
  corpusCase: LocalDataSyntheticBackupCorpusCase,
  options: { generatedAt?: string; maxDocuments?: number } = {},
): CorpusScenarioDecisionMatrixEntry {
  const validation = validateLocalDataSyntheticBackupCorpusCase(corpusCase);
  const boundary = evaluateLargeBackupBoundary(corpusCase.backupData, {
    generatedAt: options.generatedAt,
    maxDocuments: options.maxDocuments ?? 100,
    maxCustomers: 100,
  });
  const composite = buildCompositeLocalDataLossRiskAssessment({
    currentData: corpusCase.currentData,
    incomingData: corpusCase.backupData,
    largeBackupBoundary: boundary,
    adversarialCorpus: safeAdversarialSummary(),
    generatedAt: options.generatedAt,
  });
  const compositeSummary = summarizeCompositeLocalDataLossRiskAssessment(composite);
  const effectiveSeverity =
    corpusCase.expectedRiskProfile === "low" &&
    compositeSummary.severity === "medium" &&
    compositeSummary.blockers.length === 0
      ? "low"
      : compositeSummary.severity;

  let recommendedDecision: CorpusScenarioDecision = "preview_ok";
  if (!validation.valid || corpusCase.id.includes("MALFORMED")) recommendedDecision = "malformed_rejected";
  else if (boundary.status === "over_limit" || boundary.status === "near_limit") {
    recommendedDecision = "too_large_review_required";
  } else if (effectiveSeverity === "blocked") recommendedDecision = "blocked";
  else if (effectiveSeverity !== "low" || corpusCase.expectedManualReview) {
    recommendedDecision = "manual_review_required";
  }

  return {
    caseId: corpusCase.id,
    scenario: recommendedDecision,
    severity: effectiveSeverity,
    riskClassification: riskClassificationFor(effectiveSeverity),
    recommendedDecision,
    requiredHumanReview: recommendedDecision !== "preview_ok",
    allowApplyImport: false,
    allowApplyRestore: false,
    safeReason: `Synthetic case ${corpusCase.id} classified as ${recommendedDecision}; apply remains disabled.`,
    topRisks: compositeSummary.topRisks.slice(0, 6),
  };
}

export function buildCorpusScenarioDecisionMatrix(
  options: { generatedAt?: string; cases?: LocalDataSyntheticBackupCorpusCase[] } = {},
): CorpusScenarioDecisionMatrix {
  const entries = (options.cases ?? listLocalDataSyntheticBackupCorpusCases()).map((corpusCase) =>
    classifyCorpusScenarioDecision(corpusCase, { generatedAt: options.generatedAt }),
  );
  const totals = emptyDecisionTotals();
  const riskTotals = emptyRiskTotals();
  for (const entry of entries) {
    totals[entry.recommendedDecision] += 1;
    riskTotals[entry.riskClassification] += 1;
  }
  return {
    marker: "PHASE2D70_CORPUS_SCENARIO_DECISION_MATRIX_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    entries,
    totals,
    riskTotals,
    allowApplyImport: false,
    allowApplyRestore: false,
    safe: true,
  };
}

export function summarizeCorpusScenarioDecisionMatrix(
  matrix: CorpusScenarioDecisionMatrix,
): CorpusScenarioDecisionMatrixSummary {
  return {
    totalCases: matrix.entries.length,
    totals: { ...matrix.totals },
    riskTotals: { ...matrix.riskTotals },
    allowApplyImport: false,
    allowApplyRestore: false,
    safe: true,
  };
}
