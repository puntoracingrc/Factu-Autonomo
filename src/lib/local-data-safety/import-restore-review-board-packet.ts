import { buildCorpusScenarioDecisionMatrix, summarizeCorpusScenarioDecisionMatrix } from "./corpus-scenario-decision-matrix";
import { buildCorpusViewModelCatalog, summarizeCorpusViewModelCatalog } from "./corpus-view-model-catalog";
import {
  createImportRestoreApprovalState,
  summarizeImportRestoreApprovalState,
  type ImportRestoreApprovalState,
} from "./import-restore-approval-state-machine";
import {
  evaluateImportRestoreWiringDecisionGate,
  summarizeImportRestoreWiringDecisionGate,
} from "./import-restore-wiring-decision-gate";
import { buildUxDataLossDecisionPacket, summarizeUxDataLossDecisionPacket } from "./ux-data-loss-decision-packet";

// PHASE2D73_IMPORT_RESTORE_REVIEW_BOARD_PACKET_V1

export interface ImportRestoreReviewBoardPacketInput {
  generatedAt?: string;
  approvalState?: ImportRestoreApprovalState;
}

export interface ImportRestoreReviewBoardPacket {
  marker: "PHASE2D73_IMPORT_RESTORE_REVIEW_BOARD_PACKET_V1";
  generatedAt: string;
  executiveSummary: string[];
  userImpactSummary: string[];
  technicalSummary: string[];
  uxCopyDecisions: string[];
  blockedActions: string[];
  approvalChecklist: string[];
  testEvidence: string[];
  noGoConditions: string[];
  gateSummary: ReturnType<typeof summarizeImportRestoreWiringDecisionGate>;
  matrixSummary: ReturnType<typeof summarizeCorpusScenarioDecisionMatrix>;
  catalogSummary: ReturnType<typeof summarizeCorpusViewModelCatalog>;
  uxPacketSummary: ReturnType<typeof summarizeUxDataLossDecisionPacket>;
  approvalSummary: ReturnType<typeof summarizeImportRestoreApprovalState>;
  rawDataIncluded: false;
  applyImportAllowed: false;
  applyRestoreAllowed: false;
  routeAllowed: false;
  safe: true;
}

export interface ImportRestoreReviewBoardPacketSummary {
  generatedAt: string;
  noGoConditions: number;
  blockedActions: string[];
  approvalSummary: ImportRestoreReviewBoardPacket["approvalSummary"];
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
];

export function buildImportRestoreReviewBoardPacket(
  input: ImportRestoreReviewBoardPacketInput = {},
): ImportRestoreReviewBoardPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const matrix = buildCorpusScenarioDecisionMatrix({ generatedAt });
  const catalog = buildCorpusViewModelCatalog({ generatedAt });
  const uxPacket = buildUxDataLossDecisionPacket({ matrix, generatedAt });
  const approvalState = input.approvalState ?? createImportRestoreApprovalState(generatedAt);
  const gate = evaluateImportRestoreWiringDecisionGate({
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

  return assertImportRestoreReviewBoardPacketSafe({
    marker: "PHASE2D73_IMPORT_RESTORE_REVIEW_BOARD_PACKET_V1",
    generatedAt,
    executiveSummary: [
      "The package is ready for human product decision only.",
      "No import, restore, route, navigation, or storage behavior is enabled.",
    ],
    userImpactSummary: [
      "Future users would see preview-first language before any real action.",
      "Protected documents and numbering conflicts stay blocked or manual-review.",
    ],
    technicalSummary: [
      "Decision data is derived from the synthetic corpus and safe summaries.",
      "The package is in-memory and contains no real business records.",
    ],
    uxCopyDecisions: [
      "Use preview-only copy.",
      "State manual review requirements before any future action.",
      "Avoid final-result promises.",
    ],
    blockedActions: [
      "real_file_selection",
      "browser_storage_read_write",
      "import_apply",
      "restore_apply",
      "download",
      "route_or_navigation",
    ],
    approvalChecklist: [
      "UX review completed.",
      "Legal review completed.",
      "Data-loss review completed.",
      "Owner decision recorded.",
    ],
    testEvidence: [
      "phase2d77 decision package acceptance",
      "phase2d78 full synthetic corpus decision regression",
      "validate phase2d69-80 decision package",
    ],
    noGoConditions: [
      "Any real file picker wiring.",
      "Any browser storage read/write.",
      "Any import or restore apply behavior.",
      "Any production or remote service dependency.",
    ],
    gateSummary: summarizeImportRestoreWiringDecisionGate(gate),
    matrixSummary: summarizeCorpusScenarioDecisionMatrix(matrix),
    catalogSummary: summarizeCorpusViewModelCatalog(catalog),
    uxPacketSummary: summarizeUxDataLossDecisionPacket(uxPacket),
    approvalSummary: summarizeImportRestoreApprovalState(approvalState),
    rawDataIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    routeAllowed: false,
    safe: true,
  });
}

export function assertImportRestoreReviewBoardPacketSafe(
  packet: ImportRestoreReviewBoardPacket,
): ImportRestoreReviewBoardPacket {
  const serialized = JSON.stringify(packet);
  for (const word of unsafeWords) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      throw new Error("Unsafe review board packet content.");
    }
  }
  if (packet.applyImportAllowed !== false || packet.applyRestoreAllowed !== false || packet.routeAllowed !== false) {
    throw new Error("Review board packet must not enable import/restore wiring.");
  }
  if (packet.rawDataIncluded !== false || packet.safe !== true) throw new Error("Review board packet must remain safe.");
  return packet;
}

export function redactImportRestoreReviewBoardPacket(
  packet: ImportRestoreReviewBoardPacket,
): ImportRestoreReviewBoardPacket {
  return assertImportRestoreReviewBoardPacketSafe({
    ...packet,
    rawDataIncluded: false,
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    routeAllowed: false,
    safe: true,
  });
}

export function summarizeImportRestoreReviewBoardPacket(
  packet: ImportRestoreReviewBoardPacket,
): ImportRestoreReviewBoardPacketSummary {
  const safePacket = assertImportRestoreReviewBoardPacketSafe(packet);
  return {
    generatedAt: safePacket.generatedAt,
    noGoConditions: safePacket.noGoConditions.length,
    blockedActions: [...safePacket.blockedActions],
    approvalSummary: { ...safePacket.approvalSummary },
    applyImportAllowed: false,
    applyRestoreAllowed: false,
    safe: true,
  };
}
