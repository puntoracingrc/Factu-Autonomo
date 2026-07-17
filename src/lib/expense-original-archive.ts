import type {
  Expense,
  ExpenseOriginalArchiveV1,
} from "./types";
import type { ExpenseDriveArchiveUploadResultV1 } from "./google-drive/expense-original-archive.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const DRIVE_ID = /^[A-Za-z0-9_-]{1,160}$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

export function createExpenseOriginalArchiveV1(input: {
  upload: Extract<ExpenseDriveArchiveUploadResultV1, { ok: true }>;
  source: ExpenseOriginalArchiveV1["source"];
  archivedAt: string;
}): ExpenseOriginalArchiveV1 {
  const candidate: ExpenseOriginalArchiveV1 = {
    schemaVersion: 1,
    status: "archived_verified",
    source: input.source,
    sourceSha256: input.upload.sourceSha256,
    sourceMimeType: input.upload.sourceMimeType,
    driveFileId: input.upload.fileId,
    driveFolderId: input.upload.folderId,
    documentDate: input.upload.documentDate,
    verification: input.upload.verification,
    archivedAt: input.archivedAt,
  };
  const normalized = normalizeExpenseOriginalArchiveV1(candidate);
  if (!normalized) throw new Error("EXPENSE_ORIGINAL_ARCHIVE_INVALID_RECEIPT");
  return normalized;
}

export function normalizeExpenseOriginalArchiveV1(
  value: unknown,
): ExpenseOriginalArchiveV1 | undefined {
  if (!isRecord(value)) return undefined;
  const sourceMimeType = validMimeType(value.sourceMimeType);
  if (
    value.schemaVersion !== 1 ||
    value.status !== "archived_verified" ||
    (value.source !== "scan" && value.source !== "expense_inbox") ||
    typeof value.sourceSha256 !== "string" ||
    !SHA256.test(value.sourceSha256) ||
    !sourceMimeType ||
    typeof value.driveFileId !== "string" ||
    !DRIVE_ID.test(value.driveFileId) ||
    typeof value.driveFolderId !== "string" ||
    !DRIVE_ID.test(value.driveFolderId) ||
    typeof value.documentDate !== "string" ||
    !validIsoDate(value.documentDate) ||
    value.verification !== "SHA256_READBACK_MATCH" ||
    typeof value.archivedAt !== "string" ||
    !validIsoTimestamp(value.archivedAt)
  ) {
    return undefined;
  }
  return Object.freeze({
    schemaVersion: 1,
    status: "archived_verified",
    source: value.source,
    sourceSha256: value.sourceSha256,
    sourceMimeType,
    driveFileId: value.driveFileId,
    driveFolderId: value.driveFolderId,
    documentDate: value.documentDate,
    verification: "SHA256_READBACK_MATCH",
    archivedAt: value.archivedAt,
  });
}

export function normalizeExpenseOriginalArchiveOnExpense(
  expense: Expense,
): Expense {
  if (expense.originalArchive === undefined) return expense;
  const originalArchive = normalizeExpenseOriginalArchiveV1(
    expense.originalArchive,
  );
  const sourceMatches =
    originalArchive?.source === "expense_inbox"
      ? Boolean(expense.sourceInboxItemId)
      : expense.origin === "scan";
  if (
    !originalArchive ||
    !sourceMatches ||
    originalArchive.documentDate !== expense.date
  ) {
    const withoutArchive = { ...expense };
    delete withoutArchive.originalArchive;
    return withoutArchive;
  }
  return { ...expense, originalArchive };
}

export function expenseOriginalDriveFileHref(
  archive: ExpenseOriginalArchiveV1 | undefined,
): string | null {
  return archive && DRIVE_ID.test(archive.driveFileId)
    ? `https://drive.google.com/file/d/${encodeURIComponent(
        archive.driveFileId,
      )}/view`
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validMimeType(
  value: unknown,
): ExpenseOriginalArchiveV1["sourceMimeType"] | null {
  return value === "application/pdf" ||
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp" ||
    value === "image/gif"
    ? value
    : null;
}

function validIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}
