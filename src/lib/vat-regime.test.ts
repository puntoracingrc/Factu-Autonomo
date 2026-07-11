import { describe, expect, it } from "vitest";
import {
  documentAmounts,
  expenseAmount,
  isVatExempt,
  zeroIvaItems,
} from "./vat-regime";
import { issueDocument } from "./document-integrity";
import { DEFAULT_PROFILE, type Document, type Expense } from "./types";

describe("vat-regime", () => {
  it("detecta perfil exento", () => {
    expect(isVatExempt({ vatExempt: true })).toBe(true);
    expect(isVatExempt({})).toBe(false);
  });

  it("ignora IVA en importes de documentos", () => {
    const amounts = documentAmounts(
      {
        items: [
          {
            id: "1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
      },
      true,
    );
    expect(amounts).toEqual({ subtotal: 100, iva: 0, total: 100 });
  });

  it("usa el régimen fiscal congelado de cada documento emitido", () => {
    const draft: Document = {
      id: "frozen-vat",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-07-11",
      client: { name: "Cliente" },
      items: [
        {
          id: "line-1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
      ],
      status: "borrador",
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    };
    const exempt = issueDocument(
      draft,
      { ...DEFAULT_PROFILE, vatExempt: true },
      "2026-07-11T00:00:00.000Z",
    );
    const taxable = issueDocument(
      { ...draft, id: "frozen-taxable", number: "F-2026-0002" },
      { ...DEFAULT_PROFILE, vatExempt: false },
      "2026-07-11T00:00:00.000Z",
    );

    expect(documentAmounts(exempt, false)).toEqual({
      subtotal: 100,
      iva: 0,
      total: 100,
    });
    expect(documentAmounts(taxable, true)).toEqual({
      subtotal: 100,
      iva: 21,
      total: 121,
    });
  });

  it("usa importe base en gastos exentos", () => {
    const expense: Expense = {
      id: "1",
      date: "2026-06-09",
      supplierName: "P",
      description: "Gasto",
      amount: 80,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      createdAt: "2026-06-09",
    };
    expect(expenseAmount(expense, true)).toBe(80);
    expect(expenseAmount(expense, false)).toBeCloseTo(96.8, 1);
  });

  it("pone IVA a cero en líneas", () => {
    expect(zeroIvaItems([{ id: "1", description: "A", quantity: 1, unitPrice: 1, ivaPercent: 21 }])[0].ivaPercent).toBe(0);
  });
});
