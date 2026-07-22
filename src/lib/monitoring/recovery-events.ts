export const APP_ERROR_RECOVERY_CODES = {
  sync_push_verified: ["push_failed", "push_preflight_failed"],
  sync_cycle_verified: [
    "push_failed",
    "push_preflight_failed",
    "pull_failed",
  ],
  cloud_repair_verified: [
    "fiscal_workspace_diverged",
    "push_failed",
    "push_preflight_failed",
    "pull_failed",
    "cloud_repair_preview_failed",
    "force_download_failed",
  ],
} as const;

export type AppErrorRecoveryKind = keyof typeof APP_ERROR_RECOVERY_CODES;

export function normalizeAppErrorRecoveryKind(
  value: unknown,
): AppErrorRecoveryKind | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "kind") return null;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === "string" && kind in APP_ERROR_RECOVERY_CODES
    ? (kind as AppErrorRecoveryKind)
    : null;
}
