import { describe, expect, it } from "vitest";
import { buildAnnualSummaryPdf } from "./export-annual-pdf";
import { DEFAULT_PROFILE, type Document, type Expense } from "../types";

const doc: Document = {
  id: "d1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-05-10",
  client: { name: "Cliente Test" },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "pagado",
  createdAt: "2026-05-10",
  updatedAt: "2026-05-10",
};

const expense: Expense = {
  id: "e1",
  date: "2026-04-02",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Tarjeta",
  createdAt: "2026-04-02",
};

describe("export annual pdf", () => {
  it("genera un PDF con al menos una página", () => {
    const pdf = buildAnnualSummaryPdf([doc], [expense], DEFAULT_PROFILE, 2026);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
