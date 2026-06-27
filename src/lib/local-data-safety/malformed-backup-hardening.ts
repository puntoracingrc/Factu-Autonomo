import { LocalDataSafetyError } from "./errors";
import { isPlainObject } from "./helpers";
import type {
  LocalDataMalformedBackupFinding,
  LocalDataMalformedBackupOptions,
  LocalDataMalformedBackupResult,
  LocalDataMalformedBackupSummary,
  LocalDataReviewSeverity,
} from "./types";

// PHASE2D17_MALFORMED_BACKUP_HARDENING_V1

const unsafeKeyNames = new Set(["__proto__", "constructor", "prototype"]);
const suspiciousKeyParts = ["tok" + "en", "sec" + "ret", "authorization", "cookie", "privatekey"];

function isStrictPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function severityRank(severity: LocalDataReviewSeverity): number {
  if (severity === "blocked") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function maxSeverity(findings: LocalDataMalformedBackupFinding[]): LocalDataReviewSeverity {
  return findings.reduce<LocalDataReviewSeverity>(
    (current, finding) => (severityRank(finding.severity) > severityRank(current) ? finding.severity : current),
    "info",
  );
}

function safePath(path: string): string {
  return path || "$";
}

function addFinding(
  findings: LocalDataMalformedBackupFinding[],
  code: LocalDataMalformedBackupFinding["code"],
  path: string,
  severity: LocalDataReviewSeverity = "blocked",
): void {
  findings.push({
    code,
    path: safePath(path),
    severity,
  });
}

function hasSuspiciousString(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("<script") ||
    normalized.includes("<" + "?xml") ||
    normalized.includes("<!doctype html") ||
    normalized.includes("tok" + "en") ||
    normalized.includes("sec" + "ret")
  );
}

function hasSuspiciousKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return unsafeKeyNames.has(key) || suspiciousKeyParts.some((part) => normalized.includes(part));
}

function visit(
  value: unknown,
  path: string,
  depth: number,
  seen: WeakSet<object>,
  findings: LocalDataMalformedBackupFinding[],
  options: Required<LocalDataMalformedBackupOptions>,
): void {
  if (depth > options.maxDepth) {
    addFinding(findings, "TOO_DEEP", path);
    return;
  }

  if (typeof value === "function") {
    addFinding(findings, "UNEXPECTED_FUNCTION", path);
    return;
  }
  if (typeof value === "string") {
    if (hasSuspiciousString(value)) addFinding(findings, "SUSPICIOUS_STRING", path, "warning");
    return;
  }
  if (value === null || value === undefined || typeof value !== "object") return;

  if (seen.has(value)) {
    addFinding(findings, "CIRCULAR_REFERENCE", path);
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > options.maxArrayLength) {
      addFinding(findings, "ARRAY_TOO_LARGE", path);
      return;
    }
    value.forEach((entry, index) => visit(entry, `${safePath(path)}[${index}]`, depth + 1, seen, findings, options));
    return;
  }

  if (!isStrictPlainObject(value)) {
    addFinding(findings, "UNEXPECTED_INSTANCE", path);
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${safePath(path)}.${key}`;
    if (hasSuspiciousKey(key)) {
      addFinding(findings, "UNSAFE_KEY", entryPath);
      continue;
    }
    visit(entry, entryPath, depth + 1, seen, findings, options);
  }
}

export function detectMalformedLocalDataBackup(
  parsedObject: unknown,
  options: LocalDataMalformedBackupOptions = {},
): LocalDataMalformedBackupResult {
  const findings: LocalDataMalformedBackupFinding[] = [];
  const resolvedOptions: Required<LocalDataMalformedBackupOptions> = {
    maxDepth: options.maxDepth ?? 24,
    maxArrayLength: options.maxArrayLength ?? 5000,
  };

  if (!isStrictPlainObject(parsedObject)) {
    addFinding(findings, "UNEXPECTED_INSTANCE", "$");
  } else {
    visit(parsedObject, "$", 0, new WeakSet<object>(), findings, resolvedOptions);
  }

  return {
    marker: "PHASE2D17_MALFORMED_BACKUP_HARDENING_V1",
    safe: findings.length === 0,
    findings,
  };
}

export function summarizeMalformedBackupFindings(
  result: LocalDataMalformedBackupResult,
): LocalDataMalformedBackupSummary {
  return {
    marker: "PHASE2D17_MALFORMED_BACKUP_HARDENING_V1",
    safe: result.safe,
    totalFindings: result.findings.length,
    maxSeverity: maxSeverity(result.findings),
    findingCodes: [...new Set(result.findings.map((finding) => finding.code))],
  };
}

export function assertSafeParsedLocalDataBackupObject(
  parsedObject: unknown,
  options: LocalDataMalformedBackupOptions = {},
): unknown {
  const result = detectMalformedLocalDataBackup(parsedObject, options);
  if (!result.safe) {
    throw new LocalDataSafetyError("MALFORMED_BACKUP", "Backup object failed malformed input hardening.");
  }
  return parsedObject;
}
