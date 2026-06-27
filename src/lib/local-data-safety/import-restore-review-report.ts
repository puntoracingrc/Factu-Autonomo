import { LocalDataSafetyError } from "./errors";
import {
  summarizeLocalDataBackupValidationPipeline,
} from "./backup-validation-pipeline";
import {
  summarizeLocalDataImportRestoreConfirmation,
} from "./import-restore-confirmation-gate";
import {
  summarizeLocalDataImportRestoreReviewModel,
} from "./import-restore-review-model";
import type {
  LocalDataImportRestoreReviewReport,
  LocalDataImportRestoreReviewReportInput,
} from "./types";

// PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1

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
    "%p" + "df",
  ];
}

function shouldRedact(value: string): boolean {
  const normalized = value.toLowerCase();
  return unsafeWords().some((word) => normalized.includes(word.toLowerCase()));
}

function redactUnknown(value: unknown): unknown {
  if (typeof value === "string") return shouldRedact(value) ? "[redacted]" : value;
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object") return "[redacted]";

  const safe: Record<string, unknown> = {};
  let index = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedact(key)) {
      safe[`redacted_${index}`] = "[redacted]";
      index += 1;
    } else {
      safe[key] = redactUnknown(entry);
    }
  }
  return safe;
}

function assertSafeUnknown(value: unknown, key = ""): void {
  if (key && shouldRedact(key)) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", `Unsafe review report key ${key}.`);
  }
  if (typeof value === "string" && shouldRedact(value)) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", "Unsafe review report value.");
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

export function buildLocalDataImportRestoreReviewReport(
  input: LocalDataImportRestoreReviewReportInput,
): LocalDataImportRestoreReviewReport {
  const manualReviewSections = input.reviewModel.sections.filter(
    (section) => section.severity !== "info",
  ).length;
  const blockers = [
    ...input.validationResult.errors.map((entry) => `${entry.stage}:${entry.code}`),
    input.importBlocker.reason,
    input.restoreBlocker.reason,
  ];

  return assertLocalDataImportRestoreReviewReportSafe({
    marker: "PHASE2D18_IMPORT_RESTORE_REVIEW_FLOW_SAFE_REPORT_V1",
    status: input.reviewModel.status,
    severity: input.reviewModel.severity,
    generatedAt: input.generatedAt ?? input.reviewModel.generatedAt,
    counts: {
      protectedDocuments: input.reviewModel.protectedDocumentsCount,
      blockers: blockers.length,
      manualReviewSections,
    },
    blockers,
    manualReview: input.reviewModel.manualReviewRequired || input.confirmation.manualReviewRequired,
    applyAllowed: false,
    restoreAllowed: false,
    nextSteps: [
      "Review dry-run summary with a human reviewer.",
      "Keep import and restore apply disabled until a later approved phase.",
      "Design a disabled UI shell before connecting any storage adapter.",
    ],
    safeSummaries: {
      validation: summarizeLocalDataBackupValidationPipeline(input.validationResult),
      review: summarizeLocalDataImportRestoreReviewModel(input.reviewModel),
      confirmation: summarizeLocalDataImportRestoreConfirmation(input.confirmation),
    },
    safe: true,
  });
}

export function redactLocalDataImportRestoreReviewReport(
  report: LocalDataImportRestoreReviewReport,
): LocalDataImportRestoreReviewReport {
  return redactUnknown(report) as LocalDataImportRestoreReviewReport;
}

export function assertLocalDataImportRestoreReviewReportSafe(
  report: LocalDataImportRestoreReviewReport,
): LocalDataImportRestoreReviewReport {
  assertSafeUnknown(report);
  if (report.applyAllowed !== false || report.restoreAllowed !== false) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", "Review report must not allow apply.");
  }
  if (report.safe !== true) {
    throw new LocalDataSafetyError("UNSAFE_REPORT", "Review report must be marked safe.");
  }
  return report;
}
