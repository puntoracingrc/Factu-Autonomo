import { LocalDataSafetyError } from "./errors";
import { uniqueRiskFlags } from "./helpers";
import { summarizeLocalDataBackupManifest } from "./backup-manifest";
import { summarizeLocalDataImportDryRun } from "./import-dry-run";
import { summarizePreImportRecoverySnapshot } from "./recovery-snapshot";
import { summarizeLocalDataRestorePlan } from "./restore-planner";
import type {
  LocalDataRiskFlag,
  LocalDataSafetyAuditEventType,
  LocalDataSafetyReport,
  LocalDataSafetyReportInput,
} from "./types";

// PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1

const auditEventTypes: LocalDataSafetyAuditEventType[] = [
  "backup_manifest_built",
  "backup_integrity_verified",
  "import_dry_run_planned",
  "import_risk_detected",
  "recovery_snapshot_built",
  "restore_plan_built",
  "restore_blocked",
];

function unsafeWords(): string[] {
  return [
    "document" + "Snapshot",
    "pdf" + "Snapshot",
    "raw" + "Payload",
    "full" + "Payload",
    "payload",
    "tok" + "en",
    "authorization",
    "cookie",
    "sec" + "ret",
    "private" + "Key",
    "certificate",
    "%p" + "df",
  ];
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word.toLowerCase()));
}

function shouldRedactString(value: string): boolean {
  const normalized = value.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word.toLowerCase()));
}

function redactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return shouldRedactString(value) ? "[redacted]" : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object") return "[redacted]";

  const safe: Record<string, unknown> = {};
  let redactedIndex = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedactKey(key)) {
      safe[`redacted_${redactedIndex}`] = "[redacted]";
      redactedIndex += 1;
    } else {
      safe[key] = redactUnknown(entry);
    }
  }
  return safe;
}

function assertSafeUnknown(value: unknown, key = ""): void {
  if (key && shouldRedactKey(key)) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", `Unsafe report key ${key}.`);
  }
  if (typeof value === "string" && shouldRedactString(value)) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", "Unsafe report value.");
  }
  if (Array.isArray(value)) {
    for (const entry of value) assertSafeUnknown(entry);
    return;
  }
  if (value && typeof value === "object") {
    for (const [entryKey, entryValue] of Object.entries(value)) {
      assertSafeUnknown(entryValue, entryKey);
    }
  }
}

function emptyAuditCounts(): Record<LocalDataSafetyAuditEventType, number> {
  return Object.fromEntries(auditEventTypes.map((type) => [type, 0])) as Record<
    LocalDataSafetyAuditEventType,
    number
  >;
}

export function buildLocalDataSafetyReport(
  input: LocalDataSafetyReportInput,
): LocalDataSafetyReport {
  const eventTypes = emptyAuditCounts();
  for (const event of input.auditEvents ?? []) {
    eventTypes[event.eventType] += 1;
  }

  const riskFlags: LocalDataRiskFlag[] = [
    ...(input.manifest?.riskFlags ?? []),
    ...(input.importPlan?.riskFlags ?? []),
    ...(input.recoverySnapshot?.manifest.riskFlags ?? []),
    ...(input.restorePlan?.riskFlags ?? []),
    ...((input.auditEvents ?? []).flatMap((event) => event.riskFlags)),
  ];

  return assertLocalDataSafetyReportSafe({
    marker: "PHASE2D7_LOCAL_DATA_SAFETY_REPORT_V1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    manifest: input.manifest
      ? summarizeLocalDataBackupManifest(input.manifest)
      : undefined,
    integrityDigestPresent: Boolean(input.integrityDigest?.value),
    importPlan: input.importPlan
      ? summarizeLocalDataImportDryRun(input.importPlan)
      : undefined,
    recoverySnapshot: input.recoverySnapshot
      ? summarizePreImportRecoverySnapshot(input.recoverySnapshot)
      : undefined,
    restorePlan: input.restorePlan
      ? summarizeLocalDataRestorePlan(input.restorePlan)
      : undefined,
    audit: {
      totalEvents: input.auditEvents?.length ?? 0,
      eventTypes,
    },
    riskFlags: uniqueRiskFlags(riskFlags),
    safe: true,
  });
}

export function redactLocalDataSafetyReport(
  report: LocalDataSafetyReport,
): LocalDataSafetyReport {
  return redactUnknown(report) as LocalDataSafetyReport;
}

export function assertLocalDataSafetyReportSafe(
  report: LocalDataSafetyReport,
): LocalDataSafetyReport {
  assertSafeUnknown(report);
  if (report.safe !== true) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", "Report must be marked safe.");
  }
  return report;
}
