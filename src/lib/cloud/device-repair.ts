import type {
  AppDataDurabilityResult,
  DurableStorageBaseline,
} from "@/lib/app-data-durability";
import type { SaveDataResult } from "@/lib/storage";
import type { AppData } from "@/lib/types";

export interface CloudSnapshotReplacementValue {
  replacedFromCloud: true;
}

/**
 * Persiste un snapshot autoritativo de la nube sin convertirlo en cambios
 * locales pendientes. Memoria solo puede publicarlo después del readback de
 * `saveData` que aporta el caller.
 */
export function commitCloudSnapshotDurably(input: {
  expected: AppData;
  replacement: AppData;
  storageBaseline: DurableStorageBaseline;
  getCurrent: () => AppData;
  persist: (candidate: AppData, storageExpected: AppData) => SaveDataResult;
}): AppDataDurabilityResult<CloudSnapshotReplacementValue> {
  if (input.getCurrent() !== input.expected) {
    return { status: "blocked", reason: "stale_precondition" };
  }
  if (input.storageBaseline.status !== "known") {
    return input.storageBaseline;
  }

  let persistence: SaveDataResult;
  try {
    persistence = input.persist(input.replacement, input.storageBaseline.data);
  } catch {
    return { status: "indeterminate", reason: "storage_state_unknown" };
  }

  if (persistence.status !== "applied") return persistence;
  return {
    status: "applied",
    data: input.replacement,
    value: { replacedFromCloud: true },
    replayed: false,
  };
}

type SafetyCopyResult =
  { ok: true; filename: string } | { ok: false; error: string };

export type CloudDeviceRepairResult<T> =
  | { status: "backup_failed"; error: string }
  | { status: "operation_invalidated"; safetyCopyFilename?: string }
  | { status: "stale_precondition"; safetyCopyFilename: string }
  | { status: "cloud_empty"; safetyCopyFilename: string }
  | {
      status: "repair_attempted";
      safetyCopyFilename: string;
      remote: T;
      result: AppDataDurabilityResult<CloudSnapshotReplacementValue>;
    };

/**
 * Ordena la reparación completa: copia local, pull autoritativo y commit
 * durable. Un cambio local o de identidad durante cualquier espera asíncrona
 * bloquea el reemplazo; nunca se sube el estado local desde este comando.
 */
export async function runCloudDeviceRepair<T>(input: {
  getCurrent: () => AppData;
  downloadCurrent: (current: AppData) => Promise<SafetyCopyResult>;
  loadRemote: () => Promise<{ data: AppData; details: T } | null>;
  replace: (
    replacement: AppData,
    expected: AppData,
  ) => AppDataDurabilityResult<CloudSnapshotReplacementValue>;
  isOperationCurrent?: () => boolean;
}): Promise<CloudDeviceRepairResult<T>> {
  const expected = input.getCurrent();
  if (input.isOperationCurrent && !input.isOperationCurrent()) {
    return { status: "operation_invalidated" };
  }
  const safetyCopy = await input.downloadCurrent(expected);
  if (!safetyCopy.ok) {
    return { status: "backup_failed", error: safetyCopy.error };
  }

  if (input.isOperationCurrent && !input.isOperationCurrent()) {
    return {
      status: "operation_invalidated",
      safetyCopyFilename: safetyCopy.filename,
    };
  }

  if (input.getCurrent() !== expected) {
    return {
      status: "stale_precondition",
      safetyCopyFilename: safetyCopy.filename,
    };
  }

  const remote = await input.loadRemote();
  if (input.isOperationCurrent && !input.isOperationCurrent()) {
    return {
      status: "operation_invalidated",
      safetyCopyFilename: safetyCopy.filename,
    };
  }
  if (input.getCurrent() !== expected) {
    return {
      status: "stale_precondition",
      safetyCopyFilename: safetyCopy.filename,
    };
  }
  if (!remote) {
    return {
      status: "cloud_empty",
      safetyCopyFilename: safetyCopy.filename,
    };
  }

  if (input.isOperationCurrent && !input.isOperationCurrent()) {
    return {
      status: "operation_invalidated",
      safetyCopyFilename: safetyCopy.filename,
    };
  }

  return {
    status: "repair_attempted",
    safetyCopyFilename: safetyCopy.filename,
    remote: remote.details,
    result: input.replace(remote.data, expected),
  };
}
