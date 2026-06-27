import { nowIso } from "./helpers";
import type {
  DisabledLocalDataStorageAdapter,
  LocalDataStorageAdapterReadiness,
} from "./types";

// PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1

export function evaluateLocalDataStorageAdapterReadiness(
  evaluatedAt = nowIso(),
): LocalDataStorageAdapterReadiness {
  return {
    marker: "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1",
    status: "disabled",
    canRead: false,
    canWrite: false,
    reason: "DISABLED_PENDING_UI_REVIEW_AND_BACKUP",
    evaluatedAt,
  };
}

export function createDisabledLocalDataStorageAdapter(
  evaluatedAt = nowIso(),
): DisabledLocalDataStorageAdapter {
  return {
    marker: "PHASE2D16_DISABLED_LOCALSTORAGE_ADAPTER_CONTRACT_V1",
    read: () => evaluateLocalDataStorageAdapterReadiness(evaluatedAt),
    write: () => evaluateLocalDataStorageAdapterReadiness(evaluatedAt),
    summarize: () => evaluateLocalDataStorageAdapterReadiness(evaluatedAt),
  };
}

export function summarizeLocalDataStorageAdapter(
  adapter: DisabledLocalDataStorageAdapter,
): LocalDataStorageAdapterReadiness {
  return adapter.summarize();
}
