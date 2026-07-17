import { describe, expect, it } from "vitest";
import {
  createExpenseOriginalArchiveV1,
  expenseOriginalDriveFileHref,
  normalizeExpenseOriginalArchiveOnExpense,
  normalizeExpenseOriginalArchiveV1,
} from "./expense-original-archive";
import type { Expense } from "./types";

const ARCHIVE = {
  schemaVersion: 1 as const,
  status: "archived_verified" as const,
  source: "scan" as const,
  sourceSha256: "a".repeat(64),
  sourceMimeType: "application/pdf" as const,
  driveFileId: "drive_file_1",
  driveFolderId: "drive_folder_1",
  documentDate: "2026-07-17",
  verification: "SHA256_READBACK_MATCH" as const,
  archivedAt: "2026-07-17T10:00:00.000Z",
};

describe("expense original archive policy", () => {
  it("builds a minimal serializable receipt from verified Drive readback", () => {
    expect(
      createExpenseOriginalArchiveV1({
        upload: {
          ok: true,
          fileId: "drive_file_1",
          folderId: "drive_folder_1",
          sourceSha256: "a".repeat(64),
          sourceMimeType: "application/pdf",
          documentDate: "2026-07-17",
          verification: "SHA256_READBACK_MATCH",
          reusedExisting: false,
        },
        source: "scan",
        archivedAt: "2026-07-17T10:00:00.000Z",
      }),
    ).toEqual(ARCHIVE);
  });

  it("rejects invalid IDs, dates, hashes and unverified states", () => {
    expect(
      normalizeExpenseOriginalArchiveV1({
        ...ARCHIVE,
        sourceSha256: "short",
      }),
    ).toBeUndefined();
    expect(
      normalizeExpenseOriginalArchiveV1({
        ...ARCHIVE,
        documentDate: "2026-02-31",
      }),
    ).toBeUndefined();
    expect(
      normalizeExpenseOriginalArchiveV1({
        ...ARCHIVE,
        driveFileId: "bad/id",
      }),
    ).toBeUndefined();
    expect(
      normalizeExpenseOriginalArchiveV1({
        ...ARCHIVE,
        verification: "UPLOAD_ACCEPTED",
      }),
    ).toBeUndefined();
  });

  it("keeps metadata only when source and expense date agree", () => {
    const expense = syntheticExpense();
    expect(normalizeExpenseOriginalArchiveOnExpense(expense).originalArchive).toEqual(
      ARCHIVE,
    );
    expect(
      normalizeExpenseOriginalArchiveOnExpense({
        ...expense,
        date: "2026-07-18",
      }).originalArchive,
    ).toBeUndefined();
    expect(
      normalizeExpenseOriginalArchiveOnExpense({
        ...expense,
        origin: "manual",
      }).originalArchive,
    ).toBeUndefined();
  });

  it("requires inbox provenance for email originals", () => {
    const expense = syntheticExpense();
    const inboxArchive = { ...ARCHIVE, source: "expense_inbox" as const };
    expect(
      normalizeExpenseOriginalArchiveOnExpense({
        ...expense,
        originalArchive: inboxArchive,
      }).originalArchive,
    ).toBeUndefined();
    expect(
      normalizeExpenseOriginalArchiveOnExpense({
        ...expense,
        sourceInboxItemId: "inbox_1",
        originalArchive: inboxArchive,
      }).originalArchive,
    ).toEqual(inboxArchive);
  });

  it("derives the Google URL without persisting a share link", () => {
    expect(expenseOriginalDriveFileHref(ARCHIVE)).toBe(
      "https://drive.google.com/file/d/drive_file_1/view",
    );
    expect(
      expenseOriginalDriveFileHref({ ...ARCHIVE, driveFileId: "bad/id" }),
    ).toBeNull();
  });
});

function syntheticExpense(): Expense {
  return {
    id: "expense_1",
    date: "2026-07-17",
    origin: "scan",
    supplierName: "Proveedor",
    description: "Compra",
    amount: 100,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Tarjeta",
    originalArchive: ARCHIVE,
    createdAt: "2026-07-17T10:00:00.000Z",
  };
}
