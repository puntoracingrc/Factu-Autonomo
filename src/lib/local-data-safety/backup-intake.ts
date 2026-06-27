import { isPlainObject, nowIso } from "./helpers";
import type {
  LocalDataBackupIntakeCandidate,
  LocalDataBackupIntakeError,
  LocalDataBackupIntakeOptions,
  LocalDataBackupIntakeResult,
  LocalDataBackupIntakeSafeSummary,
} from "./types";

// PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1

const defaultMaxBytes = 5 * 1024 * 1024;
const forbiddenExtensions = new Set(["zip", "pdf", "xml", "html", "htm", "js", "csv"]);

function isStrictPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cleanFileName(fileName: string): string {
  return fileName.trim().replace(/[\\/]+/g, "_");
}

function extensionOf(fileName: string): string {
  const cleanName = cleanFileName(fileName).toLowerCase();
  const dot = cleanName.lastIndexOf(".");
  return dot > -1 ? cleanName.slice(dot + 1) : "";
}

function hasSuspiciousName(fileName: string): boolean {
  const cleanName = cleanFileName(fileName);
  if (cleanName !== fileName.trim()) return true;
  if (cleanName.includes("..")) return true;
  if (/[\x00-\x1f]/.test(cleanName)) return true;
  return /(?:^|[._-])(?:env|passwd|private|key)(?:[._-]|$)/i.test(cleanName);
}

function error(
  code: LocalDataBackupIntakeError["code"],
  message: string,
): LocalDataBackupIntakeError {
  return { code, message };
}

export function inspectLocalDataBackupIntakeCandidate(
  candidate: LocalDataBackupIntakeCandidate,
  options: LocalDataBackupIntakeOptions = {},
): LocalDataBackupIntakeResult {
  const inspectedAt = options.inspectedAt ?? nowIso();
  const fileName = cleanFileName(candidate.fileName ?? "");
  const extension = extensionOf(fileName);
  const mimeType = (candidate.mimeType ?? "").trim().toLowerCase();
  const maxBytes = options.maxBytes ?? defaultMaxBytes;
  const errors: LocalDataBackupIntakeError[] = [];

  if (!fileName) {
    errors.push(error("MISSING_FILE_NAME", "Backup file name is required."));
  }
  if (fileName && hasSuspiciousName(candidate.fileName)) {
    errors.push(error("SUSPICIOUS_FILE_NAME", "Backup file name is not accepted."));
  }
  if (forbiddenExtensions.has(extension)) {
    errors.push(error("FORBIDDEN_EXTENSION", "Backup file extension is forbidden."));
  } else if (extension !== "json") {
    errors.push(error("UNEXPECTED_EXTENSION", "Backup file must use the json extension."));
  }
  if (mimeType && mimeType !== "application/json") {
    errors.push(error("UNEXPECTED_MIME_TYPE", "Backup file mime type is not accepted."));
  }
  if (!mimeType && options.allowEmptyMimeType === false) {
    errors.push(error("UNEXPECTED_MIME_TYPE", "Backup file mime type is required."));
  }
  if (!Number.isSafeInteger(candidate.byteLength) || candidate.byteLength < 0 || candidate.byteLength > maxBytes) {
    errors.push(error("BACKUP_TOO_LARGE", "Backup file size is not accepted."));
  }
  if (candidate.parsedObject !== undefined && !isStrictPlainObject(candidate.parsedObject)) {
    errors.push(error("INVALID_PARSED_OBJECT", "Backup parsed object must be a plain object."));
  }

  return {
    marker: "PHASE2D11_BACKUP_FILE_INTAKE_CONTRACT_V1",
    accepted: errors.length === 0,
    inspectedAt,
    candidate: {
      fileName,
      extension,
      mimeType,
      byteLength: candidate.byteLength,
      parsedObjectPresent: candidate.parsedObject !== undefined,
    },
    errors,
  };
}

export function summarizeLocalDataBackupIntake(
  result: LocalDataBackupIntakeResult,
): LocalDataBackupIntakeSafeSummary {
  return {
    fileName: result.candidate.fileName,
    extension: result.candidate.extension,
    mimeType: result.candidate.mimeType,
    byteLength: result.candidate.byteLength,
    accepted: result.accepted,
    inspectedAt: result.inspectedAt,
    errorCodes: result.errors.map((entry) => entry.code),
  };
}
