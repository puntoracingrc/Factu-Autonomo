// PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1

export type LocalStorageResilienceOperation =
  | "read"
  | "write"
  | "delete"
  | "list_keys"
  | "clear_synthetic_only"
  | "replace_app_data"
  | "backup_before_write"
  | "verify_after_write";

export type LocalStorageResilienceDecision = "blocked" | "allowed_in_memory" | "planned_only";

export type LocalStorageResilienceSafeMode = "disabled" | "in_memory" | "dry_run";

export interface LocalStorageResilienceSafeSummary {
  status: string;
  blockers: string[];
  syntheticOnly: true;
  realStorageTouched: false;
  dataMutationAllowed: false;
  safe: true;
}

export interface LocalStorageResilienceResult<T = string | string[] | null> {
  operation: LocalStorageResilienceOperation;
  decision: LocalStorageResilienceDecision;
  value?: T;
  reason?: string;
  blockers: string[];
  syntheticOnly: true;
  realStorageTouched: false;
  dataMutationAllowed: false;
  safe: true;
}

export interface LocalStorageResilienceAdapter {
  marker: string;
  mode: Exclude<LocalStorageResilienceSafeMode, "dry_run">;
  getItem(key: string): LocalStorageResilienceResult<string | null>;
  setItem(key: string, value: string): LocalStorageResilienceResult<null>;
  removeItem(key: string): LocalStorageResilienceResult<null>;
  listKeys(): LocalStorageResilienceResult<string[]>;
  clearSyntheticOnly(): LocalStorageResilienceResult<string[]>;
  summary(): LocalStorageResilienceSafeSummary;
}

export interface InMemoryStorageState {
  entries: Record<string, string>;
}

export function isSyntheticStorageKey(key: string): boolean {
  return /^SYNTHETIC_ONLY_[A-Z0-9_.:-]+$/.test(key);
}

export function cloneInMemoryStorageState(state: InMemoryStorageState): InMemoryStorageState {
  return { entries: { ...state.entries } };
}

export function safeString(value: string): string {
  return String(value);
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
