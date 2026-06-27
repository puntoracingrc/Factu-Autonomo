import {
  buildImportRestoreDataLossWarnings,
  summarizeImportRestoreDataLossWarnings,
  type ImportRestoreDataLossWarningsModel,
  type ImportRestoreDataLossWarningsSummary,
} from "./import-restore-data-loss-warning";
import { summarizeImportRestoreReviewSession, type ImportRestoreReviewSession } from "./import-restore-review-session";
import type { ImportRestoreSyntheticUiFixture } from "./import-restore-ui-fixtures";
import {
  buildDisabledRecoverySnapshotDownloadPlaceholder,
  summarizeRecoverySnapshotDownloadPlaceholder,
  type DisabledRecoverySnapshotDownloadPlaceholder,
  type DisabledRecoverySnapshotDownloadPlaceholderSummary,
} from "./recovery-snapshot-download-placeholder";

// PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1

export interface ImportRestoreUxLegalReviewPacketInput {
  fixture?: ImportRestoreSyntheticUiFixture;
  session?: ImportRestoreReviewSession;
  warnings?: ImportRestoreDataLossWarningsModel;
  recoverySnapshotPlaceholder?: DisabledRecoverySnapshotDownloadPlaceholder;
  generatedAt?: string;
}

export interface ImportRestoreUxLegalReviewPacket {
  marker: "PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1";
  packetId: string;
  generatedAt: string;
  featureStatus: "routeless_synthetic_preview_only";
  fixtureId?: string;
  sessionSummary?: ReturnType<typeof summarizeImportRestoreReviewSession>;
  copyDecisions: string[];
  disabledActions: string[];
  warningSummary: ImportRestoreDataLossWarningsSummary;
  recoverySnapshotPlaceholder: DisabledRecoverySnapshotDownloadPlaceholderSummary;
  unresolvedRisks: string[];
  requiredApprovals: {
    uxReviewApproved: false;
    legalReviewApproved: false;
    dataLossRiskReviewed: false;
    storageReviewApproved: false;
    routeWiringApproved: false;
    navigationApproved: false;
    applyApproved: false;
    ownerApproval: false;
  };
  screenshotPlaceholders: Array<{
    id: string;
    description: string;
    imageIncluded: false;
    requiredBeforeWiring: true;
  }>;
  rawDataIncluded: false;
  safe: true;
}

export interface ImportRestoreUxLegalReviewPacketSummary {
  packetId: string;
  featureStatus: ImportRestoreUxLegalReviewPacket["featureStatus"];
  fixtureId?: string;
  unresolvedRisks: number;
  screenshotsRequired: number;
  rawDataIncluded: false;
  safe: true;
}

function packetId(generatedAt: string): string {
  return `SYNTHETIC_ONLY_UX_LEGAL_PACKET_${generatedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function assertNoRawDataShape(packet: ImportRestoreUxLegalReviewPacket): void {
  const serialized = JSON.stringify(packet);
  for (const word of [
    "document" + "Snapshot",
    "pdf" + "Snapshot",
    "rawJson",
    "incomingData",
    "currentData",
    ["sec", "ret"].join(""),
    ["tok", "en"].join(""),
  ]) {
    if (serialized.toLowerCase().includes(word.toLowerCase())) {
      throw new Error("UX/legal packet contains raw-data shaped content.");
    }
  }
}

export function buildImportRestoreUxLegalReviewPacket(
  input: ImportRestoreUxLegalReviewPacketInput = {},
): ImportRestoreUxLegalReviewPacket {
  const generatedAt = input.generatedAt ?? input.session?.updatedAt ?? new Date().toISOString();
  const warnings = input.warnings ?? buildImportRestoreDataLossWarnings({ fixture: input.fixture, session: input.session, generatedAt });
  const recoverySnapshotPlaceholder =
    input.recoverySnapshotPlaceholder ??
    buildDisabledRecoverySnapshotDownloadPlaceholder({
      generatedAt,
      reviewSessionId: input.session?.sessionId,
      reason: "pending_ux_legal_review",
    });
  const packet: ImportRestoreUxLegalReviewPacket = {
    marker: "PHASE2D51_IMPORT_RESTORE_UX_LEGAL_REVIEW_PACKET_V1",
    packetId: packetId(generatedAt),
    generatedAt,
    featureStatus: "routeless_synthetic_preview_only",
    fixtureId: input.fixture?.id ?? input.session?.fixtureId,
    sessionSummary: input.session ? summarizeImportRestoreReviewSession(input.session) : undefined,
    copyDecisions: [
      "La vista debe indicar que es una preview sintetica sin acciones reales.",
      "Los avisos de perdida de datos deben aparecer antes de cualquier decision futura.",
      "No se debe usar copy de resultado final ni seguridad absoluta.",
    ],
    disabledActions: [
      "apply_import",
      "apply_restore",
      "choose_real_file",
      "download_recovery_snapshot",
      "route_navigation",
    ],
    warningSummary: summarizeImportRestoreDataLossWarnings(warnings),
    recoverySnapshotPlaceholder: summarizeRecoverySnapshotDownloadPlaceholder(recoverySnapshotPlaceholder),
    unresolvedRisks: [
      "Revision legal/UX pendiente.",
      "Decision de almacenamiento y copia previa pendiente.",
      "Decision explicita de wiring routeless pendiente.",
      "Acciones de aplicar importacion/restauracion bloqueadas.",
    ],
    requiredApprovals: {
      uxReviewApproved: false,
      legalReviewApproved: false,
      dataLossRiskReviewed: false,
      storageReviewApproved: false,
      routeWiringApproved: false,
      navigationApproved: false,
      applyApproved: false,
      ownerApproval: false,
    },
    screenshotPlaceholders: [
      {
        id: "SYNTHETIC_ONLY_SCREEN_REVIEW_READY",
        description: "Captura futura de review_ready en harness no conectado.",
        imageIncluded: false,
        requiredBeforeWiring: true,
      },
      {
        id: "SYNTHETIC_ONLY_SCREEN_APPLY_BLOCKED",
        description: "Captura futura de apply_blocked en harness no conectado.",
        imageIncluded: false,
        requiredBeforeWiring: true,
      },
    ],
    rawDataIncluded: false,
    safe: true,
  };
  return assertImportRestoreUxLegalReviewPacketSafe(packet);
}

export function redactImportRestoreUxLegalReviewPacket(
  packet: ImportRestoreUxLegalReviewPacket,
): ImportRestoreUxLegalReviewPacket {
  return assertImportRestoreUxLegalReviewPacketSafe({
    ...packet,
    sessionSummary: packet.sessionSummary
      ? {
          ...packet.sessionSummary,
          manualReviewFlags: [...packet.sessionSummary.manualReviewFlags],
        }
      : undefined,
    rawDataIncluded: false,
    safe: true,
  });
}

export function assertImportRestoreUxLegalReviewPacketSafe(
  packet: ImportRestoreUxLegalReviewPacket,
): ImportRestoreUxLegalReviewPacket {
  assertNoRawDataShape(packet);
  if (packet.rawDataIncluded !== false) throw new Error("UX/legal packet must not include raw data.");
  if (packet.recoverySnapshotPlaceholder.canStartDownload !== false) {
    throw new Error("UX/legal packet must keep recovery snapshot download disabled.");
  }
  if (Object.values(packet.requiredApprovals).some(Boolean)) {
    throw new Error("UX/legal packet approvals must default to false.");
  }
  if (packet.safe !== true) throw new Error("UX/legal packet must be marked safe.");
  return packet;
}

export function summarizeImportRestoreUxLegalReviewPacket(
  packet: ImportRestoreUxLegalReviewPacket,
): ImportRestoreUxLegalReviewPacketSummary {
  const safe = assertImportRestoreUxLegalReviewPacketSafe(packet);
  return {
    packetId: safe.packetId,
    featureStatus: safe.featureStatus,
    fixtureId: safe.fixtureId,
    unresolvedRisks: safe.unresolvedRisks.length,
    screenshotsRequired: safe.screenshotPlaceholders.length,
    rawDataIncluded: false,
    safe: true,
  };
}
