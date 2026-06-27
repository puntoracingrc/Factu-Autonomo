import {
  buildHiddenImportRestoreShellReadinessReport,
  summarizeHiddenImportRestoreShellReadinessReport,
  type HiddenImportRestoreShellReadinessReport,
} from "./hidden-shell-readiness-report";

// PHASE2D99_HIDDEN_UI_OWNER_DECISION_PACKET_V1

export interface HiddenUiOwnerDecisionPacketInput {
  generatedAt?: string;
  readinessReport?: HiddenImportRestoreShellReadinessReport;
}

export interface HiddenUiOwnerDecisionPacket {
  marker: "PHASE2D99_HIDDEN_UI_OWNER_DECISION_PACKET_V1";
  generatedAt: string;
  requestedDecision: string;
  stillBlocked: string[];
  residualRisks: string[];
  evidence: ReturnType<typeof summarizeHiddenImportRestoreShellReadinessReport>;
  activationPrerequisites: string[];
  noActivationConditions: string[];
  authorizesEnablement: false;
  rawPayloadIncluded: false;
  realDataIncluded: false;
  secretsIncluded: false;
  safe: true;
}

export interface HiddenUiOwnerDecisionPacketSummary {
  requestedDecision: string;
  blockers: number;
  authorizesEnablement: false;
  safe: true;
}

export function buildHiddenUiOwnerDecisionPacket(
  input: HiddenUiOwnerDecisionPacketInput = {},
): HiddenUiOwnerDecisionPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const readinessReport = input.readinessReport ?? buildHiddenImportRestoreShellReadinessReport({ generatedAt });

  return assertHiddenUiOwnerDecisionPacketSafe({
    marker: "PHASE2D99_HIDDEN_UI_OWNER_DECISION_PACKET_V1",
    generatedAt,
    requestedDecision: "Decide whether a future hidden/routeless enablement phase may be planned.",
    stillBlocked: [
      "No public route.",
      "No navigation connection.",
      "No browser storage read or write.",
      "No import or restore apply.",
      "No real data.",
    ],
    residualRisks: [
      "Data-loss copy and support workflow require owner review.",
      "Protected document behavior must stay blocked or manual-review.",
      "A future enablement phase needs its own rollback plan.",
    ],
    evidence: summarizeHiddenImportRestoreShellReadinessReport(readinessReport),
    activationPrerequisites: [
      "UX review approved.",
      "Legal/data-loss review approved.",
      "Owner approval recorded outside code.",
      "No-go registry remains clear.",
    ],
    noActivationConditions: [
      "Route or navigation appears.",
      "Storage, file reader, download or apply behavior appears.",
      "Real data or remote dependency is required.",
    ],
    authorizesEnablement: false,
    rawPayloadIncluded: false,
    realDataIncluded: false,
    secretsIncluded: false,
    safe: true,
  });
}

export function assertHiddenUiOwnerDecisionPacketSafe(
  packet: HiddenUiOwnerDecisionPacket,
): HiddenUiOwnerDecisionPacket {
  if (packet.authorizesEnablement !== false) throw new Error("Owner packet must not authorize enablement by itself.");
  if (packet.rawPayloadIncluded || packet.realDataIncluded || packet.secretsIncluded || packet.safe !== true) {
    throw new Error("Owner packet must stay safe.");
  }
  return packet;
}

export function summarizeHiddenUiOwnerDecisionPacket(
  packet: HiddenUiOwnerDecisionPacket,
): HiddenUiOwnerDecisionPacketSummary {
  const safePacket = assertHiddenUiOwnerDecisionPacketSafe(packet);
  return {
    requestedDecision: safePacket.requestedDecision,
    blockers: safePacket.stillBlocked.length,
    authorizesEnablement: false,
    safe: true,
  };
}
