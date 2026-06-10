import { describe, expect, it } from "vitest";
import { calculateTaxSummary, isTaxableSaleDocument } from "./taxes";
import type { Document, Expense } from "./types";

function invoice(status: Document["status"], subtotal = 100): Document {
  return {
    id: "1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-09",
    client: { name: "Ana", firstName: "Ana", lastName: "" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: subtotal,
        ivaPercent: 21,
      },
    ],
    status,
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
  };
}

const expense: Expense = {
  id: "e1",
  date: "2026-06-09",
  supplierName: "Proveedor",
  description: "Material",
  amount: 50,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Tarjeta",
  createdAt: "2026-06-09",
};

describe("isTaxableSaleDocument", () => {
  it("incluye facturas emitidas y excluye borradores", () => {
    expect(isTaxableSaleDocument(invoice("enviado"))).toBe(true);
    expect(isTaxableSaleDocument(invoice("borrador"))).toBe(false);
    expect(isTaxableSaleDocument(invoice("anulada"))).toBe(false);
  });

  it("excluye recibos automáticos", () => {
    const autoReceipt: Document = {
      ...invoice("pagado"),
      id: "r1",
      type: "recibo",
      number: "R-1",
      sourceDocumentId: "inv-1",
    };
    expect(isTaxableSaleDocument(autoReceipt)).toBe(false);
  });
});

describe("calculateTaxSummary", () => {
  it("calcula IVA neto, IRPF y beneficio neto", () => {
    const summary = calculateTaxSummary([invoice("pagado", 1000)], [expense], {
      irpfPercent: 20,
    });
    expect(summary.salesBase).toBe(1000);
    expect(summary.salesIva).toBe(210);
    expect(summary.expenseBase).toBe(50);
    expect(summary.expenseIva).toBe(10.5);
    expect(summary.netIva).toBeCloseTo(199.5, 1);
    expect(summary.ivaToPay).toBeCloseTo(199.5, 1);
    expect(summary.grossProfit).toBe(950);
    expect(summary.irpfEstimate).toBe(190);
    expect(summary.estimatedNetProfit).toBeCloseTo(560.5, 1);
  });

  it("no calcula IVA si el perfil está exento", () => {
    const summary = calculateTaxSummary([invoice("pagado", 1000)], [expense], {
      vatExempt: true,
    });
    expect(summary.vatExempt).toBe(true);
    expect(summary.salesIva).toBe(0);
    expect(summary.expenseIva).toBe(0);
    expect(summary.estimatedNetProfit).toBe(950 - 190);
  });

  it("marca crédito de IVA cuando los gastos superan ventas", () => {
    const bigExpense: Expense = { ...expense, amount: 500 };
    const summary = calculateTaxSummary([invoice("enviado", 100)], [bigExpense], {
      irpfPercent: 20,
    });
    expect(summary.ivaCredit).toBeGreaterThan(0);
    expect(summary.ivaToPay).toBe(0);
    expect(summary.irpfEstimate).toBe(0);
  });
});
