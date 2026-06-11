import { describe, expect, it } from "vitest";
import { buildQuarterlyExportCsv } from "./export-quarterly";
import { DEFAULT_PROFILE, type Document, type Expense, type Supplier } from "../types";

const doc: Document = {
  id: "d1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-05-10",
  client: { name: "Cliente Test", nif: "87654321A" },
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
  supplierId: "s1",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
  createdAt: "2026-04-02",
};

const supplier: Supplier = {
  id: "s1",
  name: "Proveedor",
  nif: "B99887766",
  createdAt: "2026-01-01",
};

describe("export quarterly csv", () => {
  it("incluye resumen, ventas y gastos con formato para gestoría", () => {
    const csv = buildQuarterlyExportCsv(
      [doc],
      [expense],
      { ...DEFAULT_PROFILE, name: "Autónomo Test", nif: "11111111H" },
      2026,
      2,
      [supplier],
    );

    expect(csv).toContain("EXPORTACIÓN TRIMESTRAL FISCAL");
    expect(csv).toContain("2.º trimestre 2026");
    expect(csv).toContain("Autónomo Test");
    expect(csv).toContain("RESUMEN DEL PERIODO");
    expect(csv).toContain("LIBRO DE VENTAS");
    expect(csv).toContain("F-2026-0001");
    expect(csv).toContain("Cliente Test");
    expect(csv).toContain("87654321A");
    expect(csv).toContain("100,00");
    expect(csv).toContain("LIBRO DE GASTOS Y COMPRAS");
    expect(csv).toContain("Proveedor");
    expect(csv).toContain("B99887766");
    expect(csv).toContain("Transferencia");
    expect(csv).toContain("TOTAL GASTOS");
  });
});
