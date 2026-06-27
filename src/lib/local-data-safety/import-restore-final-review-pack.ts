import {
  buildCorpusScenarioDecisionMatrix,
  summarizeCorpusScenarioDecisionMatrix,
} from "./corpus-scenario-decision-matrix";
import {
  evaluateImportRestoreNoGoConditions,
  summarizeImportRestoreNoGoConditions,
  type ImportRestoreNoGoConditionsRegistry,
} from "./import-restore-no-go-conditions";

// PHASE2D96_IMPORT_RESTORE_UX_LEGAL_DATA_LOSS_FINAL_REVIEW_PACK_V1

export interface ImportRestoreFinalReviewPackInput {
  generatedAt?: string;
  noGoRegistry?: ImportRestoreNoGoConditionsRegistry;
}

export interface ImportRestoreFinalReviewPack {
  marker: "PHASE2D96_IMPORT_RESTORE_UX_LEGAL_DATA_LOSS_FINAL_REVIEW_PACK_V1";
  generatedAt: string;
  uxSummary: string[];
  legalDataLossQuestions: string[];
  corpusMatrixSummary: ReturnType<typeof summarizeCorpusScenarioDecisionMatrix>;
  noGoSummary: ReturnType<typeof summarizeImportRestoreNoGoConditions>;
  copyDecisions: string[];
  disabledActions: string[];
  unresolvedBlockers: string[];
  recommendedHumanDecision: "owner_decision_required";
  rawPayloadIncluded: false;
  realDataIncluded: false;
  secretsIncluded: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export interface ImportRestoreFinalReviewPackSummary {
  unresolvedBlockers: number;
  recommendedHumanDecision: ImportRestoreFinalReviewPack["recommendedHumanDecision"];
  realDataIncluded: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

export function buildImportRestoreFinalReviewPack(
  input: ImportRestoreFinalReviewPackInput = {},
): ImportRestoreFinalReviewPack {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const matrix = buildCorpusScenarioDecisionMatrix({ generatedAt });
  const noGoRegistry = input.noGoRegistry ?? evaluateImportRestoreNoGoConditions({ generatedAt });

  return assertImportRestoreFinalReviewPackSafe({
    marker: "PHASE2D96_IMPORT_RESTORE_UX_LEGAL_DATA_LOSS_FINAL_REVIEW_PACK_V1",
    generatedAt,
    uxSummary: [
      "Review hidden routeless shell copy before any future exposure.",
      "Keep action language preview-only until an owner decision exists.",
    ],
    legalDataLossQuestions: [
      "What recovery proof is required before any future operation?",
      "Which protected document cases must stay blocked?",
      "Which support escalation path is required for user-facing enablement?",
    ],
    corpusMatrixSummary: summarizeCorpusScenarioDecisionMatrix(matrix),
    noGoSummary: summarizeImportRestoreNoGoConditions(noGoRegistry),
    copyDecisions: [
      "Avoid product-ready promises.",
      "Show manual-review requirements before any future action.",
      "State that import and restore remain blocked.",
    ],
    disabledActions: ["file_selection", "download", "apply_import", "apply_restore"],
    unresolvedBlockers: noGoRegistry.activeConditionIds,
    recommendedHumanDecision: "owner_decision_required",
    rawPayloadIncluded: false,
    realDataIncluded: false,
    secretsIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  });
}

export function assertImportRestoreFinalReviewPackSafe(
  pack: ImportRestoreFinalReviewPack,
): ImportRestoreFinalReviewPack {
  if (pack.rawPayloadIncluded || pack.realDataIncluded || pack.secretsIncluded) {
    throw new Error("Final review pack must not include raw, real or secret material.");
  }
  if (pack.applyImportAllowed !== false || pack.applyRestoreAllowed !== false || pack.safe !== true) {
    throw new Error("Final review pack must not enable import or restore.");
  }
  return pack;
}

export function redactImportRestoreFinalReviewPack(
  pack: ImportRestoreFinalReviewPack,
): ImportRestoreFinalReviewPack {
  return assertImportRestoreFinalReviewPackSafe({
    ...pack,
    rawPayloadIncluded: false,
    realDataIncluded: false,
    secretsIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  });
}

export function summarizeImportRestoreFinalReviewPack(
  pack: ImportRestoreFinalReviewPack,
): ImportRestoreFinalReviewPackSummary {
  const safePack = assertImportRestoreFinalReviewPackSafe(pack);
  return {
    unresolvedBlockers: safePack.unresolvedBlockers.length,
    recommendedHumanDecision: safePack.recommendedHumanDecision,
    realDataIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
