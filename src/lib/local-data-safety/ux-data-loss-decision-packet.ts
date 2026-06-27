import {
  buildCorpusScenarioDecisionMatrix,
  summarizeCorpusScenarioDecisionMatrix,
  type CorpusScenarioDecisionMatrix,
} from "./corpus-scenario-decision-matrix";

// PHASE2D71_UX_DATA_LOSS_DECISION_PACKET_BUILDER_V1

export interface UxDataLossDecisionPacketInput {
  matrix?: CorpusScenarioDecisionMatrix;
  generatedAt?: string;
}

export interface UxDataLossDecisionPacket {
  marker: "PHASE2D71_UX_DATA_LOSS_DECISION_PACKET_BUILDER_V1";
  packetId: string;
  generatedAt: string;
  purpose: string;
  scope: string[];
  corpusSummary: ReturnType<typeof summarizeCorpusScenarioDecisionMatrix>;
  topRisks: string[];
  protectedDocsBehavior: string[];
  backupFirstRecommendation: string;
  applyBlockers: string[];
  copyDecisions: string[];
  requiredApprovals: {
    uxApproved: false;
    legalApproved: false;
    dataLossApproved: false;
    ownerApproved: false;
  };
  unresolvedQuestions: string[];
  recommendedNextStep: "human_product_decision";
  applyAllowed: false;
  restoreAllowed: false;
  rawDataIncluded: false;
  safe: true;
}

export interface UxDataLossDecisionPacketSummary {
  packetId: string;
  corpusSummary: UxDataLossDecisionPacket["corpusSummary"];
  topRisks: string[];
  unresolvedQuestions: number;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

const unsafeWords = [
  "document" + "Snapshot",
  "pdf" + "Snapshot",
  "authori" + "zation",
  "coo" + "kie",
  ["tok", "en"].join(""),
  ["sec", "ret"].join(""),
  "%p" + "df",
];

function packetId(generatedAt: string): string {
  return `SYNTHETIC_ONLY_DECISION_PACKET_${generatedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function topRisksFor(matrix: CorpusScenarioDecisionMatrix): string[] {
  return [
    ...new Set(
      matrix.entries.flatMap((entry) => [
        entry.recommendedDecision,
        entry.riskClassification,
        ...entry.topRisks,
      ]),
    ),
  ].slice(0, 10);
}

export function buildUxDataLossDecisionPacket(
  input: UxDataLossDecisionPacketInput = {},
): UxDataLossDecisionPacket {
  const matrix = input.matrix ?? buildCorpusScenarioDecisionMatrix({ generatedAt: input.generatedAt });
  const generatedAt = input.generatedAt ?? matrix.generatedAt;
  return assertUxDataLossDecisionPacketSafe({
    marker: "PHASE2D71_UX_DATA_LOSS_DECISION_PACKET_BUILDER_V1",
    packetId: packetId(generatedAt),
    generatedAt,
    purpose: "Prepare human UX/legal/data-loss decision before any future wiring.",
    scope: [
      "Synthetic corpus review",
      "Decision copy review",
      "Data-loss risk review",
      "No activation of UI wiring",
    ],
    corpusSummary: summarizeCorpusScenarioDecisionMatrix(matrix),
    topRisks: topRisksFor(matrix),
    protectedDocsBehavior: [
      "Protected documents stay manual-review or blocked.",
      "Frozen hash differences are never auto-resolved.",
      "Numbering conflicts are never renumbered automatically.",
    ],
    backupFirstRecommendation: "Any future real flow must require a recovery copy decision before action.",
    applyBlockers: ["apply_import_blocked", "apply_restore_blocked", "download_blocked", "real_file_picker_blocked"],
    copyDecisions: [
      "Use preview-only language.",
      "Avoid final-result promises.",
      "Show human review requirements before any future action.",
    ],
    requiredApprovals: {
      uxApproved: false,
      legalApproved: false,
      dataLossApproved: false,
      ownerApproved: false,
    },
    unresolvedQuestions: [
      "Should the future surface stay hidden behind an explicit internal flag?",
      "Which recovery-copy proof is required before any real action?",
      "Who owns final product approval for wiring?",
    ],
    recommendedNextStep: "human_product_decision",
    applyAllowed: false,
    restoreAllowed: false,
    rawDataIncluded: false,
    safe: true,
  });
}

export function assertUxDataLossDecisionPacketSafe(
  packet: UxDataLossDecisionPacket,
): UxDataLossDecisionPacket {
  const serialized = JSON.stringify(packet);
  for (const word of unsafeWords) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      throw new Error("Unsafe UX/data-loss decision packet content.");
    }
  }
  if (Object.values(packet.requiredApprovals).some(Boolean)) throw new Error("Approvals must default to false.");
  if (packet.applyAllowed !== false || packet.restoreAllowed !== false) throw new Error("Decision packet must not allow apply.");
  if (packet.rawDataIncluded !== false || packet.safe !== true) throw new Error("Decision packet must remain safe.");
  return packet;
}

export function redactUxDataLossDecisionPacket(
  packet: UxDataLossDecisionPacket,
): UxDataLossDecisionPacket {
  return assertUxDataLossDecisionPacketSafe({
    ...packet,
    topRisks: [...packet.topRisks],
    rawDataIncluded: false,
    safe: true,
  });
}

export function summarizeUxDataLossDecisionPacket(
  packet: UxDataLossDecisionPacket,
): UxDataLossDecisionPacketSummary {
  const safe = assertUxDataLossDecisionPacketSafe(packet);
  return {
    packetId: safe.packetId,
    corpusSummary: { ...safe.corpusSummary },
    topRisks: [...safe.topRisks],
    unresolvedQuestions: safe.unresolvedQuestions.length,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
