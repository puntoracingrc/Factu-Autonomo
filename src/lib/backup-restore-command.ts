import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import type { BackupDownloadResult } from "@/lib/backup";
import type { AppData } from "@/lib/types";
import {
  mergeTestDocumentRetirementBatches,
  mergeRetirementQuarantine,
  projectTestDocumentRetirementHistory,
  retirementHistoryContains,
} from "@/lib/test-document-retirement-persistence";

export interface BackupRestoreValue {
  restored: true;
}

type DurableCommit = <T>(
  expected: AppData,
  build: (previous: AppData) => AppDataTransition<T>,
) => AppDataDurabilityResult<T>;

const TENANT_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/;

/**
 * Publica una copia validada solo después de que el commit local completo haya
 * sido confirmado. El commit común añade el diff cloud y conserva la memoria
 * anterior ante blocked/indeterminate.
 */
export function runBackupRestoreCommand(input: {
  expected: AppData;
  restored: AppData;
  expectedTenantFingerprint?: string;
  commit: DurableCommit;
}): AppDataDurabilityResult<BackupRestoreValue> {
  const containsRetirementHistory =
    (input.expected.testDocumentRetirementBatches?.length ?? 0) > 0 ||
    (input.restored.testDocumentRetirementBatches?.length ?? 0) > 0;
  if (
    containsRetirementHistory &&
    !TENANT_FINGERPRINT_PATTERN.test(input.expectedTenantFingerprint ?? "")
  ) {
    return { status: "blocked", reason: "transition_failed" };
  }
  if (
    !retirementHistoryContains(
      input.restored.testDocumentRetirementBatches,
      input.expected.testDocumentRetirementBatches,
    )
  ) {
    return { status: "blocked", reason: "transition_failed" };
  }
  const retirementHistory = mergeTestDocumentRetirementBatches(
    input.expected.testDocumentRetirementBatches,
    input.restored.testDocumentRetirementBatches,
  );
  if (retirementHistory.conflicts.length > 0) {
    return { status: "blocked", reason: "transition_failed" };
  }
  const projected = projectTestDocumentRetirementHistory(
    {
      ...input.restored,
      testDocumentRetirementBatches: retirementHistory.batches,
      workspaceIntegrityQuarantine: mergeRetirementQuarantine(
        input.expected.workspaceIntegrityQuarantine,
        input.restored.workspaceIntegrityQuarantine,
      ),
    },
    input.expectedTenantFingerprint,
  );
  if (projected.status === "blocked") {
    return { status: "blocked", reason: "transition_failed" };
  }
  const restored = projected.data;
  return input.commit(input.expected, () => ({
    data: {
      ...restored,
      // La copia portable no contiene metadata de sincronización. Conservar la
      // cola local previa evita perder cambios no relacionados; trackDataDiff
      // añadirá/actualizará encima las reversiones del restore por entidad.
      meta: input.expected.meta
        ? {
            ...input.expected.meta,
            pendingChanges: input.expected.meta.pendingChanges?.map(
              (change) => ({ ...change }),
            ),
          }
        : undefined,
    },
    value: { restored: true },
  }));
}

export type BackupRestoreWithSafetyCopyResult =
  | { status: "backup_failed"; error: string }
  | { status: "stale_precondition"; safetyCopyFilename: string }
  | { status: "unexpected_failure" }
  | {
      status: "restore_attempted";
      safetyCopyFilename: string;
      result: AppDataDurabilityResult<BackupRestoreValue>;
    };

/**
 * Captura el estado actual, solicita su copia descargable y ejecuta el commit
 * sin ceder el control entre ambos pasos. Así una actualización periódica de
 * metadata cloud no convierte una restauración válida en un bucle stale.
 */
export function runBackupRestoreWithSafetyCopy(input: {
  restored: AppData;
  getCurrent: () => AppData;
  downloadCurrent: (current: AppData) => BackupDownloadResult;
  restore: (
    restored: AppData,
    expected: AppData,
  ) => AppDataDurabilityResult<BackupRestoreValue>;
}): BackupRestoreWithSafetyCopyResult {
  try {
    const expected = input.getCurrent();
    const safetyCopy = input.downloadCurrent(expected);
    if (!safetyCopy.ok) {
      return { status: "backup_failed", error: safetyCopy.error };
    }

    if (input.getCurrent() !== expected) {
      return {
        status: "stale_precondition",
        safetyCopyFilename: safetyCopy.filename,
      };
    }

    return {
      status: "restore_attempted",
      safetyCopyFilename: safetyCopy.filename,
      result: input.restore(input.restored, expected),
    };
  } catch {
    return { status: "unexpected_failure" };
  }
}
