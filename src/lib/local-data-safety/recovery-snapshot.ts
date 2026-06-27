import { buildLocalDataBackupIntegrityDigest } from "./backup-integrity";
import {
  buildLocalDataBackupManifest,
  summarizeLocalDataBackupManifest,
} from "./backup-manifest";
import { LocalDataSafetyError } from "./errors";
import { cloneJson, nowIso } from "./helpers";
import type {
  LocalDataRecoverySnapshot,
  LocalDataRecoverySnapshotOptions,
  LocalDataRecoverySnapshotSummary,
  LocalDataSafetyAppData,
} from "./types";

// PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1

export function buildPreImportRecoverySnapshot(
  currentData: LocalDataSafetyAppData,
  options: LocalDataRecoverySnapshotOptions = {},
): LocalDataRecoverySnapshot {
  const appData = cloneJson(currentData);
  const createdAt = options.createdAt ?? nowIso();
  const integrityDigest = buildLocalDataBackupIntegrityDigest(appData, createdAt);
  const manifest = buildLocalDataBackupManifest(appData, {
    generatedAt: createdAt,
    source: "local_app_data",
    integrityDigest: integrityDigest.value,
  });

  return {
    marker: "PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1",
    snapshotVersion: "pre-import-recovery-snapshot-v1",
    createdAt,
    reason: options.reason ?? "before_import",
    manifest,
    integrityDigest,
    appData,
  };
}

export function validatePreImportRecoverySnapshot(
  snapshot: LocalDataRecoverySnapshot,
): LocalDataRecoverySnapshot {
  if (snapshot.marker !== "PHASE2D5_PRE_IMPORT_RECOVERY_SNAPSHOT_BUILDER_V1") {
    throw new LocalDataSafetyError("INVALID_RECOVERY_SNAPSHOT", "Invalid recovery snapshot marker.");
  }
  if (snapshot.snapshotVersion !== "pre-import-recovery-snapshot-v1") {
    throw new LocalDataSafetyError("INVALID_RECOVERY_SNAPSHOT", "Invalid recovery snapshot version.");
  }
  if (!snapshot.appData || typeof snapshot.appData !== "object") {
    throw new LocalDataSafetyError("INVALID_RECOVERY_SNAPSHOT", "Recovery snapshot data is missing.");
  }
  return snapshot;
}

export function summarizePreImportRecoverySnapshot(
  snapshot: LocalDataRecoverySnapshot,
): LocalDataRecoverySnapshotSummary {
  const validated = validatePreImportRecoverySnapshot(snapshot);
  return {
    snapshotVersion: validated.snapshotVersion,
    createdAt: validated.createdAt,
    reason: validated.reason,
    manifest: summarizeLocalDataBackupManifest(validated.manifest),
    integrityDigestPresent: Boolean(validated.integrityDigest.value),
  };
}
