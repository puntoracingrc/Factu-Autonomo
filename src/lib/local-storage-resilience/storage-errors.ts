import { uniqueSorted } from "./types";

// PHASE2E4_STORAGE_ERROR_TAXONOMY_V1

export type LocalStorageResilienceErrorKind =
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

export interface ClassifiedLocalStorageResilienceError {
  marker: "PHASE2E4_STORAGE_ERROR_TAXONOMY_V1";
  kind: LocalStorageResilienceErrorKind;
  safeReason: string;
  remediation: string[];
  exposesPayload: false;
  includesStack: false;
  safe: true;
}

function inspectText(input: unknown): string {
  if (input instanceof Error) return `${input.name} ${input.message}`.toLowerCase();
  if (typeof input === "string") return input.toLowerCase();
  if (input && typeof input === "object" && "kind" in input) return String((input as { kind: unknown }).kind).toLowerCase();
  return "";
}

export function classifyLocalStorageResilienceError(input: unknown): ClassifiedLocalStorageResilienceError {
  const text = inspectText(input);
  let kind: LocalStorageResilienceErrorKind = "unknown_error";

  if (/quota|exceeded|full/.test(text)) kind = "quota_exceeded";
  else if (/unavailable|disabled|not available|security/.test(text)) kind = "unavailable";
  else if (/syntax|json|parse/.test(text)) kind = "parse_error";
  else if (/corrupt|tamper|checksum|digest/.test(text)) kind = "corrupted_payload";
  else if (/version|schema/.test(text)) kind = "version_mismatch";
  else if (/write.*blocked|blocked.*write/.test(text)) kind = "write_blocked";
  else if (/read.*blocked|blocked.*read/.test(text)) kind = "read_blocked";
  else if (/delete.*blocked|remove.*blocked|blocked.*delete/.test(text)) kind = "delete_blocked";
  else if (/non.synthetic|synthetic.*reject|reject.*synthetic/.test(text)) kind = "non_synthetic_key_rejected";
  else if (/suspicious|prototype|constructor|__proto__|pollution/.test(text)) kind = "suspicious_key";

  return {
    marker: "PHASE2E4_STORAGE_ERROR_TAXONOMY_V1",
    kind,
    safeReason: kind,
    remediation: remediationFor(kind),
    exposesPayload: false,
    includesStack: false,
    safe: true,
  };
}

function remediationFor(kind: LocalStorageResilienceErrorKind): string[] {
  const common = ["keep_real_storage_disabled", "use_synthetic_dry_run_only"];
  const specific: Record<LocalStorageResilienceErrorKind, string[]> = {
    quota_exceeded: ["reduce_future_payload_size", "require_backup_before_retry"],
    unavailable: ["show_manual_review_blocker", "avoid_browser_storage_assumption"],
    parse_error: ["classify_corruption_before_preview", "avoid_auto_repair"],
    corrupted_payload: ["require_manual_review", "build_recovery_preview_only"],
    version_mismatch: ["route_to_version_migration_review", "block_write_until_policy_exists"],
    write_blocked: ["keep_write_disabled", "request_owner_decision"],
    read_blocked: ["keep_read_disabled_until_adapter_review", "use_in_memory_fixture"],
    delete_blocked: ["block_destructive_operation", "require_recovery_snapshot"],
    non_synthetic_key_rejected: ["reject_real_keys", "use_synthetic_key_namespace"],
    suspicious_key: ["reject_key", "record_safe_audit_event"],
    unknown_error: ["fail_closed", "record_redacted_error_summary"],
  };
  return uniqueSorted([...common, ...specific[kind]]);
}

export function redactLocalStorageResilienceError(
  input: ClassifiedLocalStorageResilienceError | unknown,
): ClassifiedLocalStorageResilienceError {
  const classified =
    typeof input === "object" && input !== null && "marker" in input
      ? (input as ClassifiedLocalStorageResilienceError)
      : classifyLocalStorageResilienceError(input);

  return {
    marker: "PHASE2E4_STORAGE_ERROR_TAXONOMY_V1",
    kind: classified.kind,
    safeReason: classified.kind,
    remediation: uniqueSorted(classified.remediation),
    exposesPayload: false,
    includesStack: false,
    safe: true,
  };
}

export function summarizeLocalStorageResilienceError(input: unknown) {
  const redacted = redactLocalStorageResilienceError(input);
  return {
    marker: redacted.marker,
    kind: redacted.kind,
    blockerCount: redacted.remediation.length,
    exposesPayload: false,
    includesStack: false,
    safe: true,
  };
}
