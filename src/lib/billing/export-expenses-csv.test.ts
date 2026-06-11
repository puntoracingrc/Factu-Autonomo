import { describe, expect, it } from "vitest";
import { buildExpensesExportCsv } from "./export-expenses-csv";
import { DEFAULT_PROFILE, type Expense, type Supplier } from "../types";

const supplier: Supplier = {
  id: "s1",
  name: "Proveedor SL",
  nif: "B12345678",
  createdAt: "2026-01-01",
};

const expense: Expense = {
  id: "e1",
  date: "2026-04-02",
  supplierId: "s1",
  supplierName: "Proveedor SL",
  description: "Material oficina",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Tarjeta",
  notes: "Factura abril",
  createdAt: "2026-04-02",
};

describe("export expenses csv", () => {
  it("genera cabecera y columnas útiles para gestoría", () => {
    const csv = buildExpensesExportCsv([expense], [supplier], {
      profile: { ...DEFAULT_PROFILE, name: "Mi Negocio", nif: "12345678Z" },
      periodLabel: "2.º trimestre 2026",
    });

    expect(csv.startsWith("\uFEFF")).toBe(false);
    expect(csv).toContain("LIBRO DE GASTOS Y COMPRAS");
    expect(csv).toContain("Mi Negocio");
    expect(csv).toContain("12345678Z");
    expect(csv).toContain("NIF/CIF proveedor");
    expect(csv).toContain("B12345678");
    expect(csv).toContain("Material oficina");
    expect(csv).toContain("50,00");
    expect(csv).toContain("10,50");
    expect(csv).toContain("60,50");
    expect(csv).toContain("Forma de pago");
    expect(csv).toContain("Tarjeta");
    expect(csv).toContain("Factura abril");
    expect(csv).toContain("TOTAL GASTOS");
    expect(csv).toContain("RESUMEN POR CATEGORÍA");
    expect(csv).toContain("Material");
  });
});
