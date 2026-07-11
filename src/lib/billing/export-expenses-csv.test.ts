import { describe, expect, it } from "vitest";
import { buildExpensesExportCsv } from "./export-expenses-csv";
import { DEFAULT_PROFILE, type Expense, type Supplier } from "../types";
import { TaxExportBlockedError } from "../taxes";

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

function mixedVatExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    ...expense,
    id: "mixed-vat-expense",
    description: "Compra con IVA mixto",
    amount: 200,
    ivaPercent: 21,
    purchaseLines: [
      {
        id: "line-21",
        description: "Material general",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
      {
        id: "line-10",
        description: "Material reducido",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 10,
      },
    ],
    ...overrides,
  };
}

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

  it("mantiene 16 columnas en cabecera, detalle y total", () => {
    const csv = buildExpensesExportCsv([expense], [supplier], {
      profile: DEFAULT_PROFILE,
      periodLabel: "2026",
    });
    const lines = csv.split("\n");
    const header = lines.find((line) => line.startsWith("Fecha;Proveedor;"));
    const detail = lines.find((line) => line.includes("Material oficina"));
    const total = lines.find((line) => line.startsWith("TOTAL GASTOS;"));

    expect(header?.split(";")).toHaveLength(16);
    expect(detail?.split(";")).toHaveLength(16);
    expect(total?.split(";")).toHaveLength(16);
  });

  it("exporta tipos, desglose y origen conciliado para IVA mixto", () => {
    const csv = buildExpensesExportCsv(
      [mixedVatExpense()],
      [supplier],
      {
        profile: DEFAULT_PROFILE,
        periodLabel: "2026",
      },
    );

    expect(csv).toContain("Tipos IVA aplicados");
    expect(csv).toContain("Desglose IVA aplicado");
    expect(csv).toContain("Origen cálculo IVA");
    expect(csv).toContain("10% + 21%");
    expect(csv).toContain("10%: base 100,00 / IVA 10,00");
    expect(csv).toContain("21%: base 100,00 / IVA 21,00");
    expect(csv).toContain("Líneas conciliadas");
    expect(csv).toContain("31,00;231,00;200,00;31,00");
    expect(csv).toContain("Material;1;231,00;200,00;31,00");
  });

  it("identifica de forma explícita la cabecera o el importe íntegro", () => {
    const csv = buildExpensesExportCsv([expense], [supplier], {
      profile: DEFAULT_PROFILE,
      periodLabel: "2026",
    });

    expect(csv).toContain("21%");
    expect(csv).toContain("21%: base 50,00 / IVA 10,50");
    expect(csv).toContain("Cabecera o importe íntegro");
  });

  it("bloquea el CSV standalone ante un desglose mixto no conciliado", () => {
    expect(() =>
      buildExpensesExportCsv(
        [mixedVatExpense({ amount: 250 })],
        [supplier],
        {
          profile: DEFAULT_PROFILE,
          periodLabel: "2026",
        },
      ),
    ).toThrowError(TaxExportBlockedError);

    try {
      buildExpensesExportCsv(
        [mixedVatExpense({ amount: 250 })],
        [supplier],
        {
          profile: DEFAULT_PROFILE,
          periodLabel: "2026",
        },
      );
    } catch (error) {
      expect(error).toMatchObject({ unsupportedMixedVatExpenses: 1 });
    }
  });

  it("prefiere el NIF histórico del documento frente al maestro actual", () => {
    const csv = buildExpensesExportCsv(
      [
        {
          ...expense,
          purchaseDocument: { supplierNif: "B87654321" },
        },
      ],
      [supplier],
      {
        profile: DEFAULT_PROFILE,
        periodLabel: "2026",
      },
    );

    expect(csv).toContain("B87654321");
    expect(csv).not.toContain("B12345678");
  });

  it("conserva el coste no deducible y deja base e IVA fiscales a cero", () => {
    const csv = buildExpensesExportCsv(
      [{ ...expense, deductibility: "non_deductible" }],
      [supplier],
      {
        profile: DEFAULT_PROFILE,
        periodLabel: "2026",
      },
    );

    expect(csv).toContain("Tratamiento fiscal");
    expect(csv).toContain("Coste registrado (EUR)");
    expect(csv).toContain("Base deducible (EUR)");
    expect(csv).toContain("IVA deducible (EUR)");
    expect(csv).toContain(
      "No deducible;50,00;21%;21%: base 50,00 / IVA 10,50;Cabecera o importe íntegro;10,50;60,50;0,00;0,00",
    );
    expect(csv).toContain("Material;1;60,50;0,00;0,00");
  });

  it("rotula el contrato de importe íntegro de un fijo no deducible", () => {
    const csv = buildExpensesExportCsv(
      [
        mixedVatExpense({
          amount: 100,
          businessKind: "fixed",
          deductibility: "non_deductible",
          purchaseLines: [
            {
              id: "fixed-21",
              description: "Cuota general",
              quantity: 1,
              unitPrice: 60,
              ivaPercent: 21,
            },
            {
              id: "fixed-10",
              description: "Cuota reducida",
              quantity: 1,
              unitPrice: 40,
              ivaPercent: 10,
            },
          ],
        }),
      ],
      [supplier],
      { profile: DEFAULT_PROFILE, periodLabel: "2026" },
    );

    expect(csv).toContain(
      "No deducible;100,00;0%;0%: base 100,00 / IVA 0,00;Cabecera o importe íntegro;0,00;100,00;0,00;0,00",
    );
  });

  it("mantiene el coste completo no deducible en un perfil exento", () => {
    const csv = buildExpensesExportCsv(
      [
        {
          ...expense,
          amount: 100,
          ivaPercent: 21,
          deductibility: "non_deductible",
        },
      ],
      [supplier],
      {
        profile: { ...DEFAULT_PROFILE, vatExempt: true },
        periodLabel: "2026",
      },
    );

    expect(csv).toContain(
      "No deducible;100,00;0%;0%: base 100,00 / IVA 0,00;Perfil exento;0,00;100,00;0,00;0,00",
    );
    expect(csv).not.toContain("Cabecera o importe íntegro");
    expect(csv).toContain("Material;1;100,00;0,00;0,00");
  });

  it("identifica el abono y conserva sus importes firmados en detalle y totales", () => {
    const credit: Expense = {
      ...expense,
      id: "credit",
      description: "Devolución de material",
      amount: -50,
    };
    const csv = buildExpensesExportCsv([expense, credit], [supplier], {
      profile: DEFAULT_PROFILE,
      periodLabel: "2026",
    });

    expect(csv).toContain("Abono / saldo a favor · Deducible");
    expect(csv).toContain("-50,00;21%;21%: base -50,00 / IVA -10,50");
    expect(csv).toContain("TOTAL GASTOS");
    expect(csv).toContain("Material;2;0,00;0,00;0,00");
  });

  it("exporta el NIF histórico aunque la ficha de proveedor ya no exista", () => {
    const csv = buildExpensesExportCsv(
      [
        {
          ...expense,
          supplierId: undefined,
          purchaseDocument: { supplierNif: "B87654321" },
        },
      ],
      [],
      {
        profile: DEFAULT_PROFILE,
        periodLabel: "2026",
      },
    );

    expect(csv).toContain("B87654321");
  });
});
