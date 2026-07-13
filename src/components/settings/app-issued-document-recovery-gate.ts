import { createBackupData, MAX_BACKUP_PREVIEW_BYTES } from "@/lib/backup";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import type { AppData } from "@/lib/types";

export type AppIssuedRecoveryAction = "apply" | "rollback";

export interface AppIssuedRecoveryBackupProof<TData> {
  action: AppIssuedRecoveryAction;
  candidateKey: string;
  precondition: string;
  data: TData;
  filename: string;
  exportableDataFingerprint: string;
}

export type AppIssuedRecoveryBackupVerificationResult =
  | { status: "verified"; proofKey: string }
  | {
      status: "blocked";
      reason: "invalid_backup" | "backup_mismatch" | "stale_backup";
    };

export function appIssuedRecoveryBackupProofKey<TData>(
  proof: AppIssuedRecoveryBackupProof<TData>,
): string {
  return JSON.stringify([
    proof.action,
    proof.candidateKey,
    proof.precondition,
    proof.filename,
    proof.exportableDataFingerprint,
  ]);
}

export function appIssuedRecoveryExportableDataFingerprint(
  data: AppData,
): string {
  return `sha256:${sha256Hex(stableStringifySnapshot(createBackupData(data)))}`;
}

export function isAppIssuedRecoveryBackupFileSizeAllowed(
  byteLength: number,
): boolean {
  return (
    Number.isSafeInteger(byteLength) &&
    byteLength >= 0 &&
    byteLength <= MAX_BACKUP_PREVIEW_BYTES
  );
}

export function isAppIssuedRecoveryBackupProofCurrent<TData>(input: {
  action: AppIssuedRecoveryAction;
  candidateKey: string | null;
  precondition: string;
  currentData: TData;
  proof: AppIssuedRecoveryBackupProof<TData> | null;
}): boolean {
  return Boolean(
    input.candidateKey &&
    input.proof?.action === input.action &&
    input.proof.candidateKey === input.candidateKey &&
    input.proof.precondition === input.precondition &&
    input.proof.data === input.currentData,
  );
}

function isBackupReadError(
  value: AppData | { error: string },
): value is { error: string } {
  return "error" in value;
}

export function verifyAppIssuedRecoveryBackup(input: {
  action: AppIssuedRecoveryAction;
  candidateKey: string | null;
  precondition: string;
  currentData: AppData;
  proof: AppIssuedRecoveryBackupProof<AppData> | null;
  importedData: AppData | { error: string };
}): AppIssuedRecoveryBackupVerificationResult {
  if (
    !isAppIssuedRecoveryBackupProofCurrent(input) ||
    !input.proof ||
    appIssuedRecoveryExportableDataFingerprint(input.currentData) !==
      input.proof.exportableDataFingerprint
  ) {
    return { status: "blocked", reason: "stale_backup" };
  }
  if (isBackupReadError(input.importedData)) {
    return { status: "blocked", reason: "invalid_backup" };
  }
  if (
    appIssuedRecoveryExportableDataFingerprint(input.importedData) !==
    input.proof.exportableDataFingerprint
  ) {
    return { status: "blocked", reason: "backup_mismatch" };
  }
  return {
    status: "verified",
    proofKey: appIssuedRecoveryBackupProofKey(input.proof),
  };
}

export function isAppIssuedRecoveryActionReady<TData>(input: {
  action: AppIssuedRecoveryAction;
  candidateKey: string | null;
  precondition: string;
  currentData: TData;
  proof: AppIssuedRecoveryBackupProof<TData> | null;
  verifiedBackupProofKey: string | null;
  confirmedBackupProofKey: string | null;
  confirmedGroupPrecondition: string | null;
  requiredDocumentIds: readonly string[];
  confirmedDocumentIds: readonly string[];
  affectedCount: number;
  requiredPdfCount: number;
  unknownCandidateCount: number;
  busy: boolean;
  storageStateUnknown: boolean;
}): boolean {
  if (
    input.busy ||
    input.storageStateUnknown ||
    input.affectedCount <= 0 ||
    input.requiredPdfCount > 0 ||
    input.unknownCandidateCount > 0 ||
    input.confirmedGroupPrecondition !== input.precondition ||
    !isAppIssuedRecoveryBackupProofCurrent(input)
  ) {
    return false;
  }
  if (
    !input.proof ||
    input.verifiedBackupProofKey !==
      appIssuedRecoveryBackupProofKey(input.proof) ||
    input.confirmedBackupProofKey !==
      appIssuedRecoveryBackupProofKey(input.proof)
  ) {
    return false;
  }
  return input.requiredDocumentIds.every((documentId) =>
    input.confirmedDocumentIds.includes(documentId),
  );
}
