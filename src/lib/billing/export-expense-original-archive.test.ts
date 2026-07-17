import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type Expense } from "@/lib/types";
import {
  ExpenseOriginalExportError,
  buildExpenseOriginalExportArchive,
  expenseOriginalExportFolderName,
  expenseOriginalExportPeriodLabel,
} from "./export-expense-original-archive";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF");

function expense(id: string, date: string, invoiceNumber: string): Expense {
  return {
    id,
    date,
    origin: "scan",
    supplierName: "Proveedor / Uno",
    description: "Compra material",
    amount: 100,
    ivaPercent: 21,
    category: "Materiales",
    paymentMethod: "Tarjeta",
    purchaseDocument: { invoiceNumber },
    originalArchive: {
      schemaVersion: 1,
      status: "archived_verified",
      source: "scan",
      sourceSha256: "a".repeat(64),
      sourceMimeType: "application/pdf",
      driveFileId: `drive-${id}`,
      driveFolderId: "folder-1",
      documentDate: date,
      verification: "SHA256_READBACK_MATCH",
      archivedAt: "2026-07-17T08:00:00.000Z",
    },
    createdAt: `${date}T08:00:00.000Z`,
  };
}

describe("expense original ZIP export", () => {
  it("names month and quarter packages consistently", () => {
    expect(
      expenseOriginalExportPeriodLabel({ kind: "month", year: 2026, month: 5 }),
    ).toBe("Mayo 2026");
    expect(
      expenseOriginalExportFolderName(
        { kind: "quarter", year: 2026, quarter: 2 },
        "Proveedor / Uno",
      ),
    ).toBe("Gastos Trimestre 2 2026 - Proveedor Uno");
  });

  it("includes verified originals and a PDF summary without inventing missing files", async () => {
    const archived = expense("one", "2026-04-02", "A/100");
    const withoutOriginal: Expense = {
      ...expense("two", "2026-04-03", "A/101"),
      origin: "manual",
      originalArchive: undefined,
    };
    const result = await buildExpenseOriginalExportArchive(
      {
        expenses: [withoutOriginal, archived],
        suppliers: [],
        profile: { ...DEFAULT_PROFILE, name: "Negocio Sintético" },
        period: { kind: "quarter", year: 2026, quarter: 2 },
      },
      async () => ({
        bytes: PDF_BYTES,
        mimeType: "application/pdf",
        extension: ".pdf",
      }),
    );
    const files = unzipSync(
      new Uint8Array(await result.blob.arrayBuffer()),
    );

    expect(result).toMatchObject({
      fileName: "Gastos Trimestre 2 2026.zip",
      folderName: "Gastos Trimestre 2 2026",
      summaryFileName: "Resumen Gastos Trimestre 2 2026.pdf",
      expenseCount: 2,
      originalCount: 1,
      missingOriginalCount: 1,
    });
    expect(Object.keys(files)).toEqual([
      "Gastos Trimestre 2 2026/2026-04-02 - Proveedor Uno - A 100.pdf",
      "Gastos Trimestre 2 2026/Resumen Gastos Trimestre 2 2026.pdf",
    ]);
    expect(new TextDecoder().decode(files[Object.keys(files)[1]].slice(0, 4))).toBe(
      "%PDF",
    );
  });

  it("blocks the whole package when Drive cannot verify one original", async () => {
    const error = await captureError(() =>
      buildExpenseOriginalExportArchive(
        {
          expenses: [expense("one", "2026-04-02", "A/100")],
          suppliers: [],
          profile: DEFAULT_PROFILE,
          period: { kind: "month", year: 2026, month: 4 },
        },
        async () => {
          throw new Error("huella distinta");
        },
      ),
    );

    expect(error).toBeInstanceOf(ExpenseOriginalExportError);
    expect(error).toMatchObject({ code: "original_verification_failed" });
  });

  it("rejects a yearly package to preserve the three-month maximum", async () => {
    expect(() =>
      expenseOriginalExportPeriodLabel({
        kind: "month",
        year: 2026,
        month: 13,
      }),
    ).toThrow("Selecciona un mes o un trimestre válido");
  });
});

async function captureError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("expected error");
}
