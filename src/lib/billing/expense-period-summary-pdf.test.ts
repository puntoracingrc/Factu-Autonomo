import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type Expense, type Supplier } from "@/lib/types";
import {
  buildExpensePeriodSummaryModel,
  buildExpensePeriodSummaryPdf,
} from "./expense-period-summary-pdf";

const SUPPLIERS: Supplier[] = [
  {
    id: "supplier-1",
    name: "Proveedor Uno",
    nif: "B12345678",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function expense(input: Partial<Expense> & Pick<Expense, "id" | "date" | "amount">): Expense {
  return {
    supplierName: "Proveedor Uno",
    supplierId: "supplier-1",
    description: "Material",
    ivaPercent: 21,
    category: "Materiales",
    paymentMethod: "Tarjeta",
    createdAt: `${input.date}T08:00:00.000Z`,
    ...input,
  };
}

describe("expense period summary PDF", () => {
  it("totals signed expenses and distinguishes archived originals", () => {
    const model = buildExpensePeriodSummaryModel(
      [
        expense({
          id: "expense-1",
          date: "2026-04-03",
          amount: 100,
          purchaseDocument: { invoiceNumber: "P-100" },
          originalArchive: {
            schemaVersion: 1,
            status: "archived_verified",
            source: "scan",
            sourceSha256: "a".repeat(64),
            sourceMimeType: "application/pdf",
            driveFileId: "drive-file-1",
            driveFolderId: "drive-folder-1",
            documentDate: "2026-04-03",
            verification: "SHA256_READBACK_MATCH",
            archivedAt: "2026-07-17T08:00:00.000Z",
          },
        }),
        expense({
          id: "expense-2",
          date: "2026-04-05",
          amount: -20,
          purchaseDocument: { invoiceNumber: "AB-2" },
        }),
      ],
      SUPPLIERS,
      { ...DEFAULT_PROFILE, name: "Negocio Sintético", nif: "11111111H" },
      "Trimestre 2 2026",
    );

    expect(model).toMatchObject({
      expenseCount: 2,
      archivedOriginalCount: 1,
      missingOriginalCount: 1,
      registeredBase: 80,
      registeredIva: 16.8,
      registeredTotal: 96.8,
    });
    expect(model.rows.map((row) => row.originalStatus)).toEqual([
      "Archivado en Drive",
      "Sin original archivado",
    ]);
  });

  it("builds a valid A4 PDF with the public website footer", () => {
    const pdf = buildExpensePeriodSummaryPdf(
      [expense({ id: "expense-1", date: "2026-04-03", amount: 100 })],
      SUPPLIERS,
      { ...DEFAULT_PROFILE, name: "Negocio Sintético", nif: "11111111H" },
      "Abril 2026",
      new Date("2026-07-17T10:00:00.000Z"),
    );
    const bytes = new Uint8Array(pdf.output("arraybuffer"));

    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(pdf.output()).toContain("facturacion-autonomos.app");
  });
});
