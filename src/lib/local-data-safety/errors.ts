// PHASE2D1_10_LOCAL_DATA_BACKUP_RESTORE_SAFETY_V1

export type LocalDataSafetyErrorCode =
  | "INVALID_APP_DATA"
  | "INVALID_MANIFEST"
  | "INVALID_RECOVERY_SNAPSHOT"
  | "INTEGRITY_MISMATCH"
  | "UNSAFE_REPORT";

export class LocalDataSafetyError extends Error {
  constructor(
    public readonly code: LocalDataSafetyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LocalDataSafetyError";
  }
}
