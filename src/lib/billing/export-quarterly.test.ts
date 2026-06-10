import { describe, expect, it } from "vitest";
import { buildQuarterlyExportCsv } from "./export-quarterly";
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

describe("export quarterly csv", () => {
  it("incluye resumen y líneas del trimestre", () => {
    const csv = buildQuarterlyExportCsv([doc], [expense], DEFAULT_PROFILE, 2026, 2);
    expect(csv).toContain("2.º trimestre 2026");
    expect(csv).toContain("F-2026-0001");
    expect(csv).toContain("Cliente Test");
    expect(csv).toContain("Proveedor");
    expect(csv).toContain("RESUMEN");
  });
});
