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

  it("usa el total mixto conciliado en el control de gastos", () => {
    const expense: Expense = {
      id: "mixed",
      date: "2026-07-11",
      supplierName: "P",
      description: "Gasto mixto",
      amount: 200,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      createdAt: "2026-07-11",
      purchaseLines: [
        {
          id: "mixed-21",
          description: "General",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
        {
          id: "mixed-10",
          description: "Reducido",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 10,
        },
      ],
    };

    expect(expenseAmount(expense, false)).toBe(231);
    expect(expenseAmount(expense, true)).toBe(200);
  });

  it("conserva la cabecera en control si el mixto está bloqueado", () => {
    const expense: Expense = {
      id: "mixed-blocked",
      date: "2026-07-11",
      supplierName: "P",
      description: "Gasto mixto incompleto",
      amount: 300,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Tarjeta",
      createdAt: "2026-07-11",
      purchaseLines: [
        {
          id: "mixed-21",
          description: "General",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 21,
        },
        {
          id: "mixed-10",
          description: "Reducido",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: 10,
        },
        {
          id: "mixed-missing",
          description: "Sin tipo",
          quantity: 1,
          unitPrice: 100,
        },
      ],
    };

    expect(expenseAmount(expense, false)).toBe(363);
    expect(expenseAmount(expense, true)).toBe(300);
  });

  it("muestra el importe íntegro de un fijo no deducible en el listado", () => {
    const expense: Expense = {
      id: "fixed-non-deductible",
      date: "2026-07-11",
      supplierName: "P",
      description: "Fijo no desgravable",
      amount: 100,
      ivaPercent: 21,
      businessKind: "fixed",
      deductibility: "non_deductible",
      category: "Otros",
      paymentMethod: "Domiciliación",
      createdAt: "2026-07-11",
      purchaseLines: [
        {
          id: "fixed-21",
          description: "General",
          quantity: 1,
          unitPrice: 60,
          ivaPercent: 21,
        },
        {
          id: "fixed-10",
          description: "Reducido",
          quantity: 1,
          unitPrice: 40,
          ivaPercent: 10,
        },
      ],
    };

    expect(expenseAmount(expense, false)).toBe(100);
    expect(expenseAmount(expense, true)).toBe(100);
  });

  it("pone IVA a cero en líneas", () => {
    expect(zeroIvaItems([{ id: "1", description: "A", quantity: 1, unitPrice: 1, ivaPercent: 21 }])[0].ivaPercent).toBe(0);
  });
});
