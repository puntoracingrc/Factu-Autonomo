import { describe, expect, it } from "vitest";
import { createBackupData } from "./backup";
import { applySyncChanges, appDataToSyncChanges } from "./cloud/diff";
import { normalizeLoadedData } from "./storage";
import { EMPTY_DATA, type AppData, type Expense } from "./types";

const ARCHIVE = {
  schemaVersion: 1 as const,
  status: "archived_verified" as const,
  source: "expense_inbox" as const,
  sourceSha256: "b".repeat(64),
  sourceMimeType: "application/pdf" as const,
  driveFileId: "drive_file_expense_1",
  driveFolderId: "drive_folder_expense_1",
  documentDate: "2026-07-17",
  verification: "SHA256_READBACK_MATCH" as const,
  archivedAt: "2026-07-17T10:00:00.000Z",
};

describe("expense original archive persistence", () => {
  it("survives storage normalization and backup export without file bytes", () => {
    const expense = syntheticExpense();
    const loaded = normalizeLoadedData({
      ...EMPTY_DATA,
      expenses: [expense],
    });

    expect(loaded.expenses[0]?.originalArchive).toEqual(ARCHIVE);
    const backup = createBackupData(loaded);
    expect(backup.expenses[0]?.originalArchive).toEqual(ARCHIVE);
    expect(JSON.stringify(backup.expenses[0])).not.toMatch(
      /contentBase64|arrayBuffer|localFilename|accessToken|webViewLink/u,
    );
  });

  it("round-trips through cloud entity changes", () => {
    const data: AppData = { ...EMPTY_DATA, expenses: [syntheticExpense()] };
    const changes = appDataToSyncChanges(data).filter(
      (change) => change.entityType === "expense",
    );
    const restored = applySyncChanges(EMPTY_DATA, changes);

    expect(restored.expenses).toEqual(data.expenses);
  });

  it("drops forged remote archive metadata without dropping the expense", () => {
    const expense = syntheticExpense();
    const result = applySyncChanges(EMPTY_DATA, [
      {
        entityType: "expense",
        entityId: expense.id,
        deleted: false,
        payload: {
          ...expense,
          originalArchive: {
            ...ARCHIVE,
            verification: "UPLOAD_ACCEPTED",
          },
        },
        updatedAt: expense.createdAt,
      },
    ]);

    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]?.originalArchive).toBeUndefined();
    expect(result.expenses[0]?.amount).toBe(100);
  });

  it("does not alter issued documents or VeriFactu state", () => {
    const sentinelDocuments = [{ id: "issued-sentinel" }] as AppData["documents"];
    const sentinelChain = { records: [] } as unknown as NonNullable<
      AppData["verifactuChain"]
    >;
    const base: AppData = {
      ...EMPTY_DATA,
      documents: sentinelDocuments,
      verifactuChain: sentinelChain,
    };
    const expense = syntheticExpense();
    const result = applySyncChanges(base, [
      {
        entityType: "expense",
        entityId: expense.id,
        deleted: false,
        payload: expense,
        updatedAt: expense.createdAt,
      },
    ]);

    expect(result.documents).toStrictEqual(sentinelDocuments);
    expect(result.verifactuChain).toStrictEqual(sentinelChain);
  });
});

function syntheticExpense(): Expense {
  return {
    id: "expense_inbox_1",
    date: "2026-07-17",
    origin: "scan",
    sourceInboxItemId: "inbox_1",
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
