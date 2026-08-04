// PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1

export const LOCAL_STORAGE_RESILIENCE_FOUNDATION_SAFE_STATUS = {
  marker: "PHASE2E1_12_LOCAL_STORAGE_RESILIENCE_FOUNDATION_V1",
  realStorageTouched: false,
  dataMutationAllowed: false,
  safe: true,
} as const;

export * from "./types";
export * from "./errors";
export * from "./storage-adapter-contract";
export * from "./in-memory-storage-adapter";
export * from "./storage-errors";
export * from "./storage-operation-dry-run";
export * from "./backup-before-write-policy";
export * from "./storage-corruption-recovery";
export * from "./storage-safe-report";
export * from "./storage-audit-events";
