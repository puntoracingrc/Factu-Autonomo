import type {
  LocalStorageResilienceAdapter,
  LocalStorageResilienceOperation,
  LocalStorageResilienceResult,
  LocalStorageResilienceSafeSummary,
} from "./types";

// PHASE2E2_STORAGE_ADAPTER_CONTRACT_DISABLED_V1

const disabledReason = "STORAGE_ADAPTER_DISABLED_PENDING_UI_AND_DATA_REVIEW";

function blocked<T = string | string[] | null>(
  operation: LocalStorageResilienceOperation,
  value?: T,
): LocalStorageResilienceResult<T> {
  return {
    operation,
    decision: "blocked",
    value,
    reason: disabledReason,
    blockers: [disabledReason],
    syntheticOnly: true,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export function createDisabledLocalStorageResilienceAdapter(): LocalStorageResilienceAdapter {
  return {
    marker: "PHASE2E2_STORAGE_ADAPTER_CONTRACT_DISABLED_V1",
    mode: "disabled",
    getItem: (key: string) => blocked("read", key ? null : null),
    setItem: () => blocked("write", null),
    removeItem: () => blocked("delete", null),
    listKeys: () => blocked("list_keys", []),
    clearSyntheticOnly: () => blocked("clear_synthetic_only", []),
    summary: () => summarizeLocalStorageResilienceAdapter("disabled"),
  };
}

export function evaluateLocalStorageResilienceAdapterReadiness(
  input: { adapter?: LocalStorageResilienceAdapter } = {},
): LocalStorageResilienceSafeSummary {
  const adapter = input.adapter ?? createDisabledLocalStorageResilienceAdapter();
  return adapter.summary();
}

export function summarizeLocalStorageResilienceAdapter(
  mode: LocalStorageResilienceAdapter["mode"],
): LocalStorageResilienceSafeSummary {
  return {
    status: mode === "disabled" ? "disabled_by_default" : "in_memory_synthetic_only",
    blockers: mode === "disabled" ? [disabledReason] : [],
    syntheticOnly: true,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export { disabledReason as STORAGE_ADAPTER_DISABLED_REASON };
