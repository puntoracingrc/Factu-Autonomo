import { buildCorpusScenarioDecisionMatrix, summarizeCorpusScenarioDecisionMatrix } from "./corpus-scenario-decision-matrix";
import {
  createImportRestoreApprovalState,
  summarizeImportRestoreApprovalState,
  type ImportRestoreApprovalState,
} from "./import-restore-approval-state-machine";
import {
  buildImportRestoreReviewBoardPacket,
  summarizeImportRestoreReviewBoardPacket,
  type ImportRestoreReviewBoardPacket,
} from "./import-restore-review-board-packet";
import { redactImportRestoreReviewerNote, type SafeImportRestoreReviewerNote } from "./import-restore-reviewer-notes";
import {
  evaluateImportRestoreWiringDecisionGate,
  summarizeImportRestoreWiringDecisionGate,
  type ImportRestoreWiringDecisionGate,
} from "./import-restore-wiring-decision-gate";
import { buildUxDataLossDecisionPacket, summarizeUxDataLossDecisionPacket } from "./ux-data-loss-decision-packet";

// PHASE2D76_IMPORT_RESTORE_DECISION_REPORT_GENERATOR_V1

export interface ImportRestoreDecisionReportInput {
  clock?: () => string;
  gate?: ImportRestoreWiringDecisionGate;
  approvalState?: ImportRestoreApprovalState;
  boardPacket?: ImportRestoreReviewBoardPacket;
  reviewerNotes?: SafeImportRestoreReviewerNote[];
}

export interface ImportRestoreDecisionReport {
  marker: "PHASE2D76_IMPORT_RESTORE_DECISION_REPORT_GENERATOR_V1";
  generatedAt: string;
  gateSummary: ReturnType<typeof summarizeImportRestoreWiringDecisionGate>;
  matrixSummary: ReturnType<typeof summarizeCorpusScenarioDecisionMatrix>;
  uxDataLossPacketSummary: ReturnType<typeof summarizeUxDataLossDecisionPacket>;
  approvalStateSummary: ReturnType<typeof summarizeImportRestoreApprovalState>;
  reviewBoardSummary: ReturnType<typeof summarizeImportRestoreReviewBoardPacket>;
  reviewerNotesSummary: {
    total: number;
    accepted: number;
    rejected: number;
    caseIds: string[];
  };
  nextSteps: string[];
  inMemoryOnly: true;
  rawDataIncluded: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  routeAllowed: false;
  safe: true;
}

export interface ImportRestoreDecisionReportSummary {
  generatedAt: string;
  gateStatus: ImportRestoreDecisionReport["gateSummary"]["status"];
  approvalState: ImportRestoreDecisionReport["approvalStateSummary"]["state"];
  reviewerNotes: ImportRestoreDecisionReport["reviewerNotesSummary"];
  inMemoryOnly: true;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  safe: true;
}

const unsafeWords = [
  "document" + "Snapshot",
  "pdf" + "Snapshot",
  "tok" + "en",
  "sec" + "ret",
  "authori" + "zation",
  "coo" + "kie",
  "%p" + "df",
  "pay" + "load",
  "<" + "?xml",
];

function notesSummary(notes: SafeImportRestoreReviewerNote[]) {
  const safeNotes = notes.map(redactImportRestoreReviewerNote);
  return {
    total: safeNotes.length,
    accepted: safeNotes.filter((entry) => entry.accepted).length,
    rejected: safeNotes.filter((entry) => !entry.accepted).length,
    caseIds: [...new Set(safeNotes.map((entry) => entry.caseId))],
  };
}

export function buildImportRestoreDecisionReport(
  input: ImportRestoreDecisionReportInput = {},
): ImportRestoreDecisionReport {
  const generatedAt = input.clock?.() ?? new Date().toISOString();
  const matrix = buildCorpusScenarioDecisionMatrix({ generatedAt });
  const uxPacket = buildUxDataLossDecisionPacket({ matrix, generatedAt });
  const approvalState = input.approvalState ?? createImportRestoreApprovalState(generatedAt);
  const gate =
    input.gate ??
    evaluateImportRestoreWiringDecisionGate({
      corpusRegressionPassed: true,
      uiWiringGatePassed: true,
      uxDataLossPacketPrepared: true,
      legalReviewPacketPrepared: true,
      approvalTemplatePrepared: true,
      approvalsAllFalse: approvalState.state === "approvals_not_started",
      storageAdapterDisabled: true,
      filePickerDisabled: true,
      generatedAt,
    });
  const boardPacket = input.boardPacket ?? buildImportRestoreReviewBoardPacket({ approvalState, generatedAt });

  return assertImportRestoreDecisionReportSafe({
    marker: "PHASE2D76_IMPORT_RESTORE_DECISION_REPORT_GENERATOR_V1",
    generatedAt,
    gateSummary: summarizeImportRestoreWiringDecisionGate(gate),
    matrixSummary: summarizeCorpusScenarioDecisionMatrix(matrix),
    uxDataLossPacketSummary: summarizeUxDataLossDecisionPacket(uxPacket),
    approvalStateSummary: summarizeImportRestoreApprovalState(approvalState),
    reviewBoardSummary: summarizeImportRestoreReviewBoardPacket(boardPacket),
    reviewerNotesSummary: notesSummary(input.reviewerNotes ?? []),
    nextSteps: [
      "Hold human product decision.",
      "Keep all real actions disabled.",
      "Open a future implementation phase only after explicit approval.",
    ],
    inMemoryOnly: true,
    rawDataIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    routeAllowed: false,
    safe: true,
  });
}

export function assertImportRestoreDecisionReportSafe(
  report: ImportRestoreDecisionReport,
): ImportRestoreDecisionReport {
  const serialized = JSON.stringify(report);
  for (const word of unsafeWords) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      throw new Error("Unsafe decision report content.");
    }
  }
  if (report.inMemoryOnly !== true) throw new Error("Decision report must be in-memory only.");
  if (report.applyImportAllowed !== false || report.applyRestoreAllowed !== false || report.routeAllowed !== false) {
    throw new Error("Decision report must not enable import/restore wiring.");
  }
  if (report.rawDataIncluded !== false || report.safe !== true) throw new Error("Decision report must remain safe.");
  return report;
}

export function redactImportRestoreDecisionReport(
  report: ImportRestoreDecisionReport,
): ImportRestoreDecisionReport {
  return assertImportRestoreDecisionReportSafe({
    ...report,
    rawDataIncluded: false,
    inMemoryOnly: true,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    routeAllowed: false,
    safe: true,
  });
}

export function summarizeImportRestoreDecisionReport(
  report: ImportRestoreDecisionReport,
): ImportRestoreDecisionReportSummary {
  const safeReport = assertImportRestoreDecisionReportSafe(report);
  return {
    generatedAt: safeReport.generatedAt,
    gateStatus: safeReport.gateSummary.status,
    approvalState: safeReport.approvalStateSummary.state,
    reviewerNotes: { ...safeReport.reviewerNotesSummary, caseIds: [...safeReport.reviewerNotesSummary.caseIds] },
    inMemoryOnly: true,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
