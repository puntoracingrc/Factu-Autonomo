import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import type { BackupDownloadResult } from "@/lib/backup";
import type { AppData } from "@/lib/types";
import {
  applyTestDocumentRetirement,
  rollbackTestDocumentRetirement,
  testDocumentRetirementExportableDataFingerprint,
  type TestDocumentRetirementApplyResult,
  type TestDocumentRetirementBackupEvidenceV1,
  type TestDocumentRetirementPreview,
  type TestDocumentRetirementRollbackPreview,
  type TestDocumentRetirementRollbackResult,
} from "./test-document-retirement";

type ApplyBlocked = Extract<
  TestDocumentRetirementApplyResult,
  { status: "blocked" }
>;
type RollbackBlocked = Extract<
  TestDocumentRetirementRollbackResult,
  { status: "blocked" }
>;

export interface AppliedTestDocumentRetirement {
  batchId: string;
}

export type DurableTestDocumentRetirementResult =
  | AppDataDurabilityResult<AppliedTestDocumentRetirement>
  | ApplyBlocked;

export type DurableTestDocumentRetirementRollbackResult =
  | AppDataDurabilityResult<AppliedTestDocumentRetirement>
  | RollbackBlocked;

type DurableCommit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

function sameDurableData(left: AppData, right: AppData): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

export function runTestDocumentRetirementCommand(input: {
  expected: AppData;
  preview: TestDocumentRetirementPreview;
  tenantFingerprint: string;
  backup: TestDocumentRetirementBackupEvidenceV1;
  now: string;
  commit: DurableCommit;
}): DurableTestDocumentRetirementResult {
  const transition = applyTestDocumentRetirement(
    input.expected,
    input.preview,
    input.now,
    input.tenantFingerprint,
    input.backup,
  );
  if (transition.status === "blocked") return transition;

  const value = { batchId: transition.batchId };
  if (transition.status === "already_applied") {
    if (!sameDurableData(transition.data, input.expected)) {
      return { status: "blocked", reason: "stale_preview" };
    }
    return {
      status: "applied",
      data: input.expected,
      value,
      replayed: true,
    };
  }

  return input.commit(input.expected, () => ({
    data: transition.data,
    value,
  }));
}

export function runTestDocumentRetirementRollbackCommand(input: {
  expected: AppData;
  preview: TestDocumentRetirementRollbackPreview;
  tenantFingerprint: string;
  backup: TestDocumentRetirementBackupEvidenceV1;
  now: string;
  commit: DurableCommit;
}): DurableTestDocumentRetirementRollbackResult {
  const transition = rollbackTestDocumentRetirement(
    input.expected,
    input.preview,
    input.now,
    input.tenantFingerprint,
    input.backup,
  );
  if (transition.status === "blocked") return transition;

  const value = { batchId: transition.batchId };
  if (transition.status === "already_rolled_back") {
    if (!sameDurableData(transition.data, input.expected)) {
      return { status: "blocked", reason: "stale_preview" };
    }
    return {
      status: "applied",
      data: input.expected,
      value,
      replayed: true,
    };
  }

  return input.commit(input.expected, () => ({
    data: transition.data,
    value,
  }));
}

export type TestDocumentRetirementSafetyActionResult<T> =
  | { status: "backup_failed"; error: string }
  | { status: "stale_precondition"; safetyCopyFilename: string }
  | { status: "unexpected_failure" }
  | {
      status: "action_attempted";
      safetyCopyFilename: string;
      result: T;
    };

function runWithSafetyCopy<T>(input: {
  getCurrent: () => AppData;
  downloadCurrent: (current: AppData, createdAt: Date) => BackupDownloadResult;
  act: (
    expected: AppData,
    at: string,
    backup: TestDocumentRetirementBackupEvidenceV1,
  ) => T;
  now?: () => Date;
}): TestDocumentRetirementSafetyActionResult<T> {
  try {
    const expected = input.getCurrent();
    const createdAt = input.now?.() ?? new Date();
    const exportedAt = createdAt.toISOString();
    const exportableDataFingerprint =
      testDocumentRetirementExportableDataFingerprint(expected);
    const safetyCopy = input.downloadCurrent(expected, createdAt);
    if (!safetyCopy.ok) {
      return { status: "backup_failed", error: safetyCopy.error };
    }
    if (
      safetyCopy.disposition !== "browser_download_requested" ||
      !/^sha256:[a-f0-9]{64}$/.test(safetyCopy.contentSha256) ||
      !Number.isSafeInteger(safetyCopy.byteLength) ||
      safetyCopy.byteLength <= 0
    ) {
      return {
        status: "backup_failed",
        error: "No se pudo acreditar el JSON exacto solicitado al navegador.",
      };
    }
    if (input.getCurrent() !== expected) {
      return {
        status: "stale_precondition",
        safetyCopyFilename: safetyCopy.filename,
      };
    }

    return {
      status: "action_attempted",
      safetyCopyFilename: safetyCopy.filename,
      result: input.act(expected, exportedAt, {
        filename: safetyCopy.filename,
        createdAt: exportedAt,
        exportableDataFingerprint,
        contentSha256: safetyCopy.contentSha256,
        byteLength: safetyCopy.byteLength,
        disposition: safetyCopy.disposition,
      }),
    };
  } catch {
    return { status: "unexpected_failure" };
  }
}

/** Copia y commit se ejecutan sin await/setTimeout entre ambos. */
export function runTestDocumentRetirementWithSafetyCopy(input: {
  getCurrent: () => AppData;
  downloadCurrent: (current: AppData, createdAt: Date) => BackupDownloadResult;
  preview: TestDocumentRetirementPreview;
  tenantFingerprint: string;
  apply: (input: {
    expected: AppData;
    preview: TestDocumentRetirementPreview;
    tenantFingerprint: string;
    backup: TestDocumentRetirementBackupEvidenceV1;
    now: string;
  }) => DurableTestDocumentRetirementResult;
  now?: () => Date;
}): TestDocumentRetirementSafetyActionResult<DurableTestDocumentRetirementResult> {
  return runWithSafetyCopy({
    getCurrent: input.getCurrent,
    downloadCurrent: input.downloadCurrent,
    now: input.now,
    act: (expected, at, backup) =>
      input.apply({
        expected,
        preview: input.preview,
        tenantFingerprint: input.tenantFingerprint,
        backup,
        now: at,
      }),
  });
}

/** El rollback exige y registra una segunda copia del estado retirado vigente. */
export function runTestDocumentRetirementRollbackWithSafetyCopy(input: {
  getCurrent: () => AppData;
  downloadCurrent: (current: AppData, createdAt: Date) => BackupDownloadResult;
  preview: TestDocumentRetirementRollbackPreview;
  tenantFingerprint: string;
  rollback: (input: {
    expected: AppData;
    preview: TestDocumentRetirementRollbackPreview;
    tenantFingerprint: string;
    backup: TestDocumentRetirementBackupEvidenceV1;
    now: string;
  }) => DurableTestDocumentRetirementRollbackResult;
  now?: () => Date;
}): TestDocumentRetirementSafetyActionResult<DurableTestDocumentRetirementRollbackResult> {
  return runWithSafetyCopy({
    getCurrent: input.getCurrent,
    downloadCurrent: input.downloadCurrent,
    now: input.now,
    act: (expected, at, backup) =>
      input.rollback({
        expected,
        preview: input.preview,
        tenantFingerprint: input.tenantFingerprint,
        backup,
        now: at,
      }),
  });
}
