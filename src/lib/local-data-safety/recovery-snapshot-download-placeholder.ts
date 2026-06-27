// PHASE2D50_DISABLED_RECOVERY_SNAPSHOT_DOWNLOAD_PLACEHOLDER_V1

export interface DisabledRecoverySnapshotDownloadPlaceholderInput {
  generatedAt?: string;
  reviewSessionId?: string;
  reason?: "pending_ui_storage_review" | "pending_ux_legal_review" | "synthetic_preview_only";
}

export interface DisabledRecoverySnapshotDownloadPlaceholder {
  marker: "PHASE2D50_DISABLED_RECOVERY_SNAPSHOT_DOWNLOAD_PLACEHOLDER_V1";
  status: "disabled";
  generatedAt: string;
  reviewSessionId?: string;
  reason: "pending_ui_storage_review" | "pending_ux_legal_review" | "synthetic_preview_only";
  disabled: true;
  canBuildBinary: false;
  canCreateObjectUrl: false;
  canStartDownload: false;
  requiresExplicitUiStorageReview: true;
  userFacingReason: string;
  safe: true;
}

export interface DisabledRecoverySnapshotDownloadPlaceholderSummary {
  status: "disabled";
  reason: DisabledRecoverySnapshotDownloadPlaceholder["reason"];
  canStartDownload: false;
  requiresExplicitUiStorageReview: true;
  safe: true;
}

export function buildDisabledRecoverySnapshotDownloadPlaceholder(
  input: DisabledRecoverySnapshotDownloadPlaceholderInput = {},
): DisabledRecoverySnapshotDownloadPlaceholder {
  return {
    marker: "PHASE2D50_DISABLED_RECOVERY_SNAPSHOT_DOWNLOAD_PLACEHOLDER_V1",
    status: "disabled",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    reviewSessionId: input.reviewSessionId,
    reason: input.reason ?? "pending_ui_storage_review",
    disabled: true,
    canBuildBinary: false,
    canCreateObjectUrl: false,
    canStartDownload: false,
    requiresExplicitUiStorageReview: true,
    userFacingReason:
      "La descarga de una copia de recuperacion queda deshabilitada hasta una fase revisada de UX, legal y almacenamiento.",
    safe: true,
  };
}

export function assertRecoverySnapshotDownloadDisabled(
  placeholder: DisabledRecoverySnapshotDownloadPlaceholder,
): DisabledRecoverySnapshotDownloadPlaceholder {
  if (placeholder.disabled !== true) throw new Error("Recovery snapshot placeholder must remain disabled.");
  if (placeholder.canBuildBinary || placeholder.canCreateObjectUrl || placeholder.canStartDownload) {
    throw new Error("Recovery snapshot placeholder must not enable download behavior.");
  }
  if (!placeholder.requiresExplicitUiStorageReview) {
    throw new Error("Recovery snapshot placeholder requires explicit UI/storage review.");
  }
  return placeholder;
}

export function summarizeRecoverySnapshotDownloadPlaceholder(
  placeholder: DisabledRecoverySnapshotDownloadPlaceholder,
): DisabledRecoverySnapshotDownloadPlaceholderSummary {
  const safe = assertRecoverySnapshotDownloadDisabled(placeholder);
  return {
    status: "disabled",
    reason: safe.reason,
    canStartDownload: false,
    requiresExplicitUiStorageReview: true,
    safe: true,
  };
}
