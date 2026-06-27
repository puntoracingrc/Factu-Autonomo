import {
  cloneInMemoryStorageState,
  isSyntheticStorageKey,
  safeString,
  type InMemoryStorageState,
  type LocalStorageResilienceAdapter,
  type LocalStorageResilienceResult,
} from "./types";
import { summarizeLocalStorageResilienceAdapter } from "./storage-adapter-contract";

// PHASE2E3_IN_MEMORY_STORAGE_ADAPTER_V1

function rejected(operation: "read" | "write" | "delete", key: string): LocalStorageResilienceResult<null> {
  return {
    operation,
    decision: "blocked",
    value: null,
    reason: key ? "NON_SYNTHETIC_KEY_REJECTED" : "EMPTY_KEY_REJECTED",
    blockers: ["NON_SYNTHETIC_KEY_REJECTED"],
    syntheticOnly: true,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

function allowed<T>(operation: "read" | "write" | "delete" | "list_keys" | "clear_synthetic_only", value: T): LocalStorageResilienceResult<T> {
  return {
    operation,
    decision: "allowed_in_memory",
    value,
    blockers: [],
    syntheticOnly: true,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}

export function createInMemoryLocalStorageResilienceAdapter(
  input: { state?: InMemoryStorageState } = {},
): LocalStorageResilienceAdapter & { snapshot(): InMemoryStorageState } {
  let state = cloneInMemoryStorageState(input.state ?? { entries: {} });

  return {
    marker: "PHASE2E3_IN_MEMORY_STORAGE_ADAPTER_V1",
    mode: "in_memory",
    getItem(key: string) {
      if (!isSyntheticStorageKey(key)) return rejected("read", key);
      return allowed("read", state.entries[key] ?? null);
    },
    setItem(key: string, value: string) {
      if (!isSyntheticStorageKey(key)) return rejected("write", key);
      state = { entries: { ...state.entries, [key]: safeString(value) } };
      return allowed("write", null);
    },
    removeItem(key: string) {
      if (!isSyntheticStorageKey(key)) return rejected("delete", key);
      const next = { ...state.entries };
      delete next[key];
      state = { entries: next };
      return allowed("delete", null);
    },
    listKeys() {
      return allowed("list_keys", Object.keys(state.entries).sort());
    },
    clearSyntheticOnly() {
      const removed = Object.keys(state.entries).filter(isSyntheticStorageKey).sort();
      state = { entries: Object.fromEntries(Object.entries(state.entries).filter(([key]) => !isSyntheticStorageKey(key))) };
      return allowed("clear_synthetic_only", removed);
    },
    summary: () => summarizeLocalStorageResilienceAdapter("in_memory"),
    snapshot: () => cloneInMemoryStorageState(state),
  };
}

export { cloneInMemoryStorageState };

export function summarizeInMemoryStorageState(state: InMemoryStorageState) {
  const cloned = cloneInMemoryStorageState(state);
  const keys = Object.keys(cloned.entries);
  return {
    marker: "PHASE2E3_IN_MEMORY_STORAGE_ADAPTER_V1",
    keyCount: keys.length,
    syntheticKeyCount: keys.filter(isSyntheticStorageKey).length,
    nonSyntheticRejected: keys.some((key) => !isSyntheticStorageKey(key)),
    syntheticOnly: true,
    realStorageTouched: false,
    dataMutationAllowed: false,
    safe: true,
  };
}
