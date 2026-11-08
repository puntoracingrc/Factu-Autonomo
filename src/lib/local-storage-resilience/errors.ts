import type { LocalStorageResilienceOperation } from "./types";

// PHASE2E2_STORAGE_ADAPTER_CONTRACT_DISABLED_V1

export type LocalStorageResilienceErrorCode =
  | "quota_exceeded"
  | "unavailable"
  | "parse_error"
  | "corrupted_payload"
  | "version_mismatch"
  | "write_blocked"
  | "read_blocked"
  | "delete_blocked"
  | "non_synthetic_key_rejected"
  | "suspicious_key"
  | "unknown_error";

export class LocalStorageResilienceError extends Error {
  readonly code: LocalStorageResilienceErrorCode;
  readonly operation?: LocalStorageResilienceOperation;

  constructor(code: LocalStorageResilienceErrorCode, message: string, operation?: LocalStorageResilienceOperation) {
    super(message);
    this.name = "LocalStorageResilienceError";
    this.code = code;
    this.operation = operation;
  }
}

export const LOCAL_STORAGE_RESILIENCE_ERROR_CONTRACT_SAFE = {
  marker: "PHASE2E2_STORAGE_ADAPTER_CONTRACT_DISABLED_V1",
  realStorageTouched: false,
  dataMutationAllowed: false,
  safe: true,
} as const;
